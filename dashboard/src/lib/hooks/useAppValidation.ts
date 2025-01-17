import { PorterApp } from "@porter-dev/api-contracts";
import {
  PorterAppFormData,
  SourceOptions,
  clientAppToProto,
} from "lib/porter-apps";
import { useCallback, useContext } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { match } from "ts-pattern";
import { z } from "zod";

export type AppValidationResult = {
  validatedAppProto: PorterApp;
  variables: Record<string, string>;
  secrets: Record<string, string>;
};

export const useAppValidation = ({
  deploymentTargetID,
  creating = false,
}: {
  deploymentTargetID?: string;
  creating?: boolean;
}) => {
  const { currentProject, currentCluster } = useContext(Context);

  const getBranchHead = async ({
    projectID,
    source,
  }: {
    projectID: number;
    source: SourceOptions & {
      type: "github";
    };
  }) => {
    const [owner, repo_name] = await z
      .tuple([z.string(), z.string()])
      .parseAsync(source.git_repo_name?.split("/"));

    const res = await api.getBranchHead(
      "<token>",
      {},
      {
        ...source,
        project_id: projectID,
        kind: "github",
        owner,
        name: repo_name,
        branch: source.git_branch,
      }
    );

    const commitData = await z
      .object({
        commit_sha: z.string(),
      })
      .parseAsync(res.data);

    return commitData;
  };

  const validateApp = useCallback(
    async (
      data: PorterAppFormData,
      prevRevision?: PorterApp
    ): Promise<AppValidationResult> => {
      if (!currentProject || !currentCluster) {
        throw new Error("No project or cluster selected");
      }

      if (!deploymentTargetID) {
        throw new Error("No deployment target selected");
      }

      const { env } = data.app;
      const variables = env
        .filter(
          (e) =>
            !e.hidden && !e.deleted && e.value.length > 0 && e.key.length > 0
        )
        .reduce((acc: Record<string, string>, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
      const secrets = env
        .filter((e) => !e.deleted && e.value.length > 0 && e.key.length > 0)
        .reduce((acc: Record<string, string>, item) => {
          if (item.hidden) {
            acc[item.key] = item.value;
          }
          return acc;
        }, {});

      const proto = clientAppToProto(data);
      const commit_sha = await match(data.source)
        .with({ type: "github" }, async (src) => {
          if (!creating) {
            return "";
          }

          const { commit_sha } = await getBranchHead({
            projectID: currentProject.id,
            source: src,
          });
          return commit_sha;
        })
        .with({ type: "docker-registry" }, () => {
          return "";
        })
        .exhaustive();

      const serviceDeletions = data.app.services.reduce(
        (
          acc: Record<
            string,
            { domain_names: string[]; ingress_annotation_keys: string[] }
          >,
          svc
        ) => {
          acc[svc.name.value] = {
            domain_names: svc.domainDeletions.map((d) => d.name),
            ingress_annotation_keys: svc.ingressAnnotationDeletions.map(
              (ia) => ia.key
            ),
          };

          return acc;
        },
        {}
      );

      const res = await api.validatePorterApp(
        "<token>",
        {
          b64_app_proto: btoa(
            proto.toJsonString({
              emitDefaultValues: true,
            })
          ),
          deployment_target_id: deploymentTargetID,
          commit_sha,
          deletions: {
            service_names: data.deletions.serviceNames.map((s) => s.name),
            predeploy: data.deletions.predeploy.map((s) => s.name),
            env_group_names: data.deletions.envGroupNames.map((eg) => eg.name),
            env_variable_names: [],
            service_deletions: serviceDeletions,
          },
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );

      const validAppData = await z
        .object({
          validate_b64_app_proto: z.string(),
        })
        .parseAsync(res.data);

      const validatedAppProto = PorterApp.fromJsonString(
        atob(validAppData.validate_b64_app_proto),
        {
          ignoreUnknownFields: true,
        }
      );

      return { validatedAppProto: validatedAppProto, variables, secrets };
    },
    [deploymentTargetID, currentProject, currentCluster]
  );

  return {
    validateApp,
  };
};
