package porter_app

import (
	"context"
	"fmt"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

type envVariarableOptions struct {
	includeSecrets bool
}

// EnvVariableOption is a function that modifies AppEnvironmentFromProto
type EnvVariableOption func(*envVariarableOptions)

// WithSecrets includes secrets in the environment groups
func WithSecrets() EnvVariableOption {
	return func(opts *envVariarableOptions) {
		opts.includeSecrets = true
	}
}

// AppEnvironmentFromProtoInput is the input struct for AppEnvironmentFromProto
type AppEnvironmentFromProtoInput struct {
	App              *porterv1.PorterApp
	DeploymentTarget *models.DeploymentTarget
	K8SAgent         *kubernetes.Agent
}

// AppEnvironmentFromProto returns all envfironment groups referenced in an app proto with their variables
func AppEnvironmentFromProto(ctx context.Context, inp AppEnvironmentFromProtoInput, varOpts ...EnvVariableOption) ([]environment_groups.EnvironmentGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "porter-app-env-from-proto")
	defer span.End()

	var envGroups []environment_groups.EnvironmentGroup

	if inp.DeploymentTarget == nil {
		return nil, telemetry.Error(ctx, span, nil, "must provide a deployment target")
	}
	if inp.K8SAgent == nil {
		return nil, telemetry.Error(ctx, span, nil, "must provide a kubernetes agent")
	}
	if inp.App == nil {
		return nil, telemetry.Error(ctx, span, nil, "must provide an app")
	}

	var opts envVariarableOptions
	for _, opt := range varOpts {
		opt(&opts)
	}

	var namespace string
	switch inp.DeploymentTarget.SelectorType {
	case models.DeploymentTargetSelectorType_Namespace:
		namespace = inp.DeploymentTarget.Selector
	default:
		return envGroups, telemetry.Error(ctx, span, nil, "deployment target selector type not supported")
	}

	for _, envGroupRef := range inp.App.EnvGroups {
		envGroup, err := environment_groups.EnvironmentGroupInTargetNamespace(ctx, inp.K8SAgent, environment_groups.EnvironmentGroupInTargetNamespaceInput{
			Name:      envGroupRef.GetName(),
			Version:   int(envGroupRef.GetVersion()),
			Namespace: namespace,
		})
		if err != nil {
			return nil, err
		}

		if !opts.includeSecrets {
			envGroup.SecretVariables = nil
		}

		envGroups = append(envGroups, envGroup)
	}

	return envGroups, nil
}

// AppEnvGroupName returns the name of the environment group for the app
func AppEnvGroupName(ctx context.Context, appName string, deploymentTargetId string, clusterID uint, porterAppRepository repository.PorterAppRepository) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "app-env-group-name")
	defer span.End()

	if appName == "" {
		return "", telemetry.Error(ctx, span, nil, "app name is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	if deploymentTargetId == "" {
		return "", telemetry.Error(ctx, span, nil, "deployment target id is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetId})

	if clusterID == 0 {
		return "", telemetry.Error(ctx, span, nil, "cluster id is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: clusterID})

	porterApp, err := porterAppRepository.ReadPorterAppByName(clusterID, appName)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error reading porter app by name")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-id", Value: porterApp.ID})

	if len(deploymentTargetId) < 6 {
		return "", telemetry.Error(ctx, span, nil, "deployment target id is too short")
	}

	return fmt.Sprintf("%d-%s", porterApp.ID, deploymentTargetId[:6]), nil
}