import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  PorterAppFormData,
  SourceOptions,
  clientAppFromProto,
  porterAppFormValidator,
} from "lib/porter-apps";
import { zodResolver } from "@hookform/resolvers/zod";
import RevisionsList from "./RevisionsList";
import { useLatestRevision } from "./LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { useHistory } from "react-router";
import { match } from "ts-pattern";
import Overview from "./tabs/Overview";
import { useAppValidation } from "lib/hooks/useAppValidation";
import api from "shared/api";
import { useQueryClient } from "@tanstack/react-query";
import Settings from "./tabs/Settings";
import BuildSettings from "./tabs/BuildSettings";
import Environment from "./tabs/Environment";

// commented out tabs are not yet implemented
// will be included as support is available based on data from app revisions rather than helm releases
const validTabs = [
  // "activity",
  // "events",
  "overview",
  // "logs",
  // "metrics",
  // "debug",
  "environment",
  "build-settings",
  "settings",
  // "helm-values",
  // "job-history",
] as const;
const DEFAULT_TAB = "overview";
type ValidTab = typeof validTabs[number];

type AppDataContainerProps = {
  tabParam?: string;
};

const AppDataContainer: React.FC<AppDataContainerProps> = ({ tabParam }) => {
  const history = useHistory();
  const queryClient = useQueryClient();
  const [redeployOnSave, setRedeployOnSave] = useState(false);

  const {
    porterApp,
    latestProto,
    latestRevision,
    projectId,
    clusterId,
    deploymentTargetId,
    servicesFromYaml,
  } = useLatestRevision();
  const { validateApp } = useAppValidation({
    deploymentTargetID: deploymentTargetId,
  });

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  const latestSource: SourceOptions = useMemo(() => {
    if (porterApp.image_repo_uri) {
      const [repository, tag] = porterApp.image_repo_uri.split(":");
      return {
        type: "docker-registry",
        image: {
          repository,
          tag,
        },
      };
    }

    return {
      type: "github",
      git_repo_id: porterApp.git_repo_id ?? 0,
      git_repo_name: porterApp.repo_name ?? "",
      git_branch: porterApp.git_branch ?? "",
      porter_yaml_path: porterApp.porter_yaml_path ?? "./porter.yaml",
    };
  }, [porterApp]);

  const porterAppFormMethods = useForm<PorterAppFormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(porterAppFormValidator),
    defaultValues: {
      app: clientAppFromProto(latestProto, servicesFromYaml),
      source: latestSource,
    },
  });
  const {
    reset,
    handleSubmit,
    formState: { dirtyFields },
  } = porterAppFormMethods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      const validatedAppProto = await validateApp(data);
      await api.applyApp(
        "<token>",
        {
          b64_app_proto: btoa(validatedAppProto.toJsonString()),
          deployment_target_id: deploymentTargetId,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
        }
      );

      if (
        redeployOnSave &&
        latestSource.type === "github" &&
        dirtyFields.app?.build
      ) {
        await api.reRunGHWorkflow(
          "<token>",
          {},
          {
            project_id: projectId,
            cluster_id: clusterId,
            git_installation_id: latestSource.git_repo_id,
            owner: latestSource.git_repo_name.split("/")[0],
            name: latestSource.git_repo_name.split("/")[1],
            branch: porterApp.git_branch,
            filename: "porter_stack_" + porterApp.name + ".yml",
          }
        );

        setRedeployOnSave(false);
      }

      await queryClient.invalidateQueries([
        "getLatestRevision",
        projectId,
        clusterId,
        deploymentTargetId,
        porterApp.name,
      ]);
    } catch (err) {}
  });

  useEffect(() => {
    if (servicesFromYaml) {
      reset({
        app: clientAppFromProto(latestProto, servicesFromYaml),
        source: latestSource,
      });
    }
  }, [servicesFromYaml, currentTab]);

  return (
    <FormProvider {...porterAppFormMethods}>
      <form onSubmit={onSubmit}>
        <RevisionsList
          latestRevisionNumber={latestRevision.revision_number}
          deploymentTargetId={deploymentTargetId}
          projectId={projectId}
          clusterId={clusterId}
          appName={porterApp.name}
          sourceType={latestSource.type}
        />
        <Spacer y={1} />
        <TabSelector
          noBuffer
          options={[
            { label: "Overview", value: "overview" },
            { label: "Environment", value: "environment" },
            ...(latestProto.build
              ? [
                  {
                    label: "Build Settings",
                    value: "build-settings",
                  },
                ]
              : []),
            { label: "Settings", value: "settings" },
          ]}
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            history.push(`/apps/${porterApp.name}/${tab}`);
          }}
        />
        <Spacer y={1} />
        {match(currentTab)
          .with("overview", () => <Overview />)
          .with("build-settings", () => (
            <BuildSettings
              redeployOnSave={redeployOnSave}
              setRedeployOnSave={setRedeployOnSave}
            />
          ))
          .with("environment", () => <Environment />)
          .with("settings", () => <Settings />)
          .otherwise(() => null)}
        <Spacer y={2} />
      </form>
    </FormProvider>
  );
};

export default AppDataContainer;