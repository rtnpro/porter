export const environments = [
  {
    id: 29,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 22158312,
    git_repo_owner: "porter-dev",
    git_repo_name: "porter-docs",
    name: "Preview",
  },
  {
    id: 36,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 21704327,
    git_repo_owner: "jnfrati",
    git_repo_name: "angular-todo-app",
    name: "Preview",
  },
  {
    id: 37,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 21704327,
    git_repo_owner: "jnfrati",
    git_repo_name: "porter-docs",
    name: "Preview",
    deployment_count: 3,
    last_deployment_status: "failed",
  },
  {
    id: 38,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 21704327,
    git_repo_owner: "jnfrati",
    git_repo_name: "porter-docs",
    name: "Preview",
  },
  {
    id: 39,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 21704327,
    git_repo_owner: "jnfrati",
    git_repo_name: "multi-tenant-blog",
    name: "Preview",
  },
  {
    id: 40,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 18424822,
    git_repo_owner: "sunguroku",
    git_repo_name: "node",
    name: "Preview",
  },
  {
    id: 41,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 18424822,
    git_repo_owner: "sunguroku",
    git_repo_name: "code-server",
    name: "Preview",
  },
  {
    id: 42,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 22158312,
    git_repo_owner: "porter-dev",
    git_repo_name: "preview-env",
    name: "Preview",
  },
  {
    id: 43,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 22158312,
    git_repo_owner: "porter-dev",
    git_repo_name: "preview",
    name: "Preview",
  },
  {
    id: 44,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 22158312,
    git_repo_owner: "porter-dev",
    git_repo_name: "preview-env-test",
    name: "Preview",
  },
  {
    id: 45,
    project_id: 3,
    cluster_id: 34,
    git_installation_id: 22158312,
    git_repo_owner: "porter-dev",
    git_repo_name: "ptrtr",
    name: "Preview",
  },
];

export const deployments = [
  {
    gh_deployment_id: 534980099,
    gh_pr_name: "Update porter.yaml",
    gh_repo_name: "preview",
    gh_repo_owner: "porter-dev",
    gh_commit_sha: "74a1191",
    id: 43,
    created_at: "2022-03-28T19:28:11.012729Z",
    updated_at: "2022-03-28T19:31:53.871666Z",
    git_installation_id: 0,
    environment_id: 43,
    namespace: "pr-3-preview",
    status: "failed",
    subdomain: "",
    pull_request_id: 3,
  },
  {
    gh_deployment_id: 532608734,
    gh_pr_name: "Testing pr preview",
    gh_repo_name: "porter-docs",
    gh_repo_owner: "jnfrati",
    gh_commit_sha: "6a4b67e",
    id: 41,
    created_at: "2022-03-24T20:24:17.103471Z",
    updated_at: "2022-03-24T20:45:06.684096Z",
    git_installation_id: 0,
    environment_id: 37,
    namespace: "pr-1-porter-docs",
    status: "inactive",
    subdomain: "https://docs-web-7b93751b98e68139.staging-onporter.run",
    pull_request_id: 1,
  },
  {
    gh_deployment_id: 514002155,
    gh_pr_name: "Testing PR with job run",
    gh_repo_name: "porter-docs",
    gh_repo_owner: "porter-dev",
    gh_commit_sha: "443d930",
    id: 32,
    created_at: "2022-01-30T11:04:14.496147Z",
    updated_at: "2022-02-24T22:02:27.17928Z",
    git_installation_id: 0,
    environment_id: 29,
    namespace: "pr-20-porter-docs",
    status: "created",
    subdomain: "https://docs-web-78a048205ac7869b.staging-onporter.run",
    pull_request_id: 20,
  },
];

export const pull_requests = [
  {
    pr_title: "Testing PR with job run",
    pr_number: 1,
    repo_owner: "porter-docs",
    repo_name: "porter-dev",
    branch_from: "some_branch",
    branch_into: "main",
  },
];