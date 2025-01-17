import React, { Component, useContext } from "react";
import styled from "styled-components";
import api from "shared/api";

import { Context } from "shared/Context";
import { ClusterType } from "shared/types";

import InputRow from "components/form-components/InputRow";
import EnvGroupArray, { KeyValueType } from "./EnvGroupArray";
import Selector from "components/Selector";
import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import { isAlphanumeric } from "shared/common";

type PropsType = {
  goBack: () => void;
  currentCluster: ClusterType;
};

type StateType = {
  expand: boolean;
  update: any[];
  envGroupName: string;
  selectedNamespace: string;
  namespaceOptions: any[];
  envVariables: KeyValueType[];
  submitStatus: string;
};

export default class CreateEnvGroup extends Component<PropsType, StateType> {
  state = {
    expand: false,
    update: [] as any[],
    envGroupName: "",
    selectedNamespace: "default",
    namespaceOptions: [] as any[],
    envVariables: [] as KeyValueType[],
    submitStatus: "",
  };
  componentDidMount() {
    this.updateNamespaces();
  }

  isDisabled = () => {
    const { envGroupName } = this.state;
    return (
      !isAlphanumeric(envGroupName) ||
      envGroupName === "" ||
      envGroupName.length > 15
    );
  };

  onSubmit = () => {
    this.setState({ submitStatus: "loading" });

    let apiEnvVariables: Record<string, string> = {};
    let secretEnvVariables: Record<string, string> = {};

    let envVariables = this.state.envVariables;

    if (this.context.currentProject.simplified_view_enabled) {
      api
        .createNamespace(
          "<token>",
          {
            name: "porter-env-group",
          },
          {
            id: this.context.currentProject.id,
            cluster_id: this.props.currentCluster.id,
          }
        )
        .catch((error) => {
          if (error.response && error.response.status === 412) {
            console.log("Ignoring known 412 error");
          } else {
            console.error(error);
          }
        });
    }
    envVariables
      .filter((envVar: KeyValueType, index: number, self: KeyValueType[]) => {
        // remove any collisions that are marked as deleted and are duplicates
        let numCollisions = self.reduce((n, _envVar: KeyValueType) => {
          return n + (_envVar.key === envVar.key ? 1 : 0);
        }, 0);

        if (numCollisions == 1) {
          return true;
        } else {
          return (
            index ===
            self.findIndex(
              (_envVar: KeyValueType) =>
                _envVar.key === envVar.key && !_envVar.deleted
            )
          );
        }
      })
      .forEach((envVar: KeyValueType) => {
        if (!envVar.deleted) {
          if (envVar.hidden) {
            secretEnvVariables[envVar.key] = envVar.value;
          } else {
            apiEnvVariables[envVar.key] = envVar.value;
          }
        }
      });

    api
      .createEnvGroup(
        "<token>",
        {
          name: this.state.envGroupName,
          variables: apiEnvVariables,
          secret_variables: secretEnvVariables,
        },
        {
          id: this.context.currentProject.id,
          cluster_id: this.props.currentCluster.id,
          namespace: this.context.currentProject.simplified_view_enabled ? "porter-env-group" : this.state.selectedNamespace,
        }
      )
      .then((res) => {
        this.setState({ submitStatus: "successful" });
        // console.log(res);
        this.props.goBack();
      })
      .catch((err) => {
        this.setState({ submitStatus: "Could not create" });
      });
  };

  createEnv = () => {
    this.setState({ submitStatus: "loading" });

    let apiEnvVariables: Record<string, string> = {};
    let secretEnvVariables: Record<string, string> = {};

    let envVariables = this.state.envVariables;
    envVariables
      .filter((envVar: KeyValueType, index: number, self: KeyValueType[]) => {
        // remove any collisions that are marked as deleted and are duplicates
        let numCollisions = self.reduce((n, _envVar: KeyValueType) => {
          return n + (_envVar.key === envVar.key ? 1 : 0);
        }, 0);

        if (numCollisions == 1) {
          return true;
        } else {
          return (
            index ===
            self.findIndex(
              (_envVar: KeyValueType) =>
                _envVar.key === envVar.key && !_envVar.deleted
            )
          );
        }
      })
      .forEach((envVar: KeyValueType) => {
        if (!envVar.deleted) {
          if (envVar.hidden) {
            secretEnvVariables[envVar.key] = envVar.value;
          } else {
            apiEnvVariables[envVar.key] = envVar.value;
          }
        }
      });

    api
      .createEnvironmentGroups(
        "<token>",
        {
          name: this.state.envGroupName,
          variables: apiEnvVariables,
          secret_variables: secretEnvVariables,
        },
        {
          id: this.context.currentProject.id,
          cluster_id: this.props.currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({ submitStatus: "successful" });
        // console.log(res);
        this.props.goBack();
      })
      .catch((err) => {
        this.setState({ submitStatus: "Could not create" });
      });
  };

  updateNamespaces = () => {
    let { currentProject } = this.context;
    api
      .getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: this.props.currentCluster.id,
        }
      )
      .then((res) => {
        if (res.data) {
          const availableNamespaces = res.data.filter((namespace: any) => {
            return namespace.status !== "Terminating";
          });
          const namespaceOptions = availableNamespaces.map(
            (x: { name: string }) => {
              return { label: x.name, value: x.name };
            }
          );
          if (availableNamespaces.length > 0) {
            this.setState({ namespaceOptions });
          }
        }
      })
      .catch(console.log);
  };

  render() {
    return (
      <>
        <StyledCreateEnvGroup>
          <HeaderSection>
            <Button onClick={this.props.goBack}>
              <i className="material-icons">keyboard_backspace</i>
              Back
            </Button>
            <Title>Create an environment group</Title>
          </HeaderSection>
          <Wrapper>
            <DarkMatter antiHeight="-13px" />
            <Heading isAtTop={true}>Name</Heading>
            <Subtitle>
              <Warning
                makeFlush={true}
                highlight={
                  (!isAlphanumeric(this.state.envGroupName) ||
                    this.state.envGroupName.length > 15) &&
                  this.state.envGroupName !== ""
                }
              >
                Lowercase letters, numbers, and "-" only. Maximum 15 characters.
              </Warning>
            </Subtitle>
            <DarkMatter antiHeight="-29px" />
            <InputRow
              type="text"
              value={this.state.envGroupName}
              setValue={(x: string) => this.setState({ envGroupName: x })}
              placeholder="ex: my-env-group"
              width="100%"
            />
            {!this?.context?.currentProject?.simplified_view_enabled && (<>
              <Heading>Destination</Heading>
              <Subtitle>
                Specify the namespace you would like to create this environment
                group in.
              </Subtitle>
              <DestinationSection>
                <NamespaceLabel>
                  <i className="material-icons">view_list</i>Namespace
                </NamespaceLabel>
                <Selector
                  key={"namespace"}
                  activeValue={this.state.selectedNamespace}
                  setActiveValue={(namespace: string) =>
                    this.setState({ selectedNamespace: namespace })
                  }
                  options={this.state.namespaceOptions}
                  width="250px"
                  dropdownWidth="335px"
                  closeOverlay={true}
                />
              </DestinationSection>
            </>
            )
            }
            <Heading>Environment variables</Heading>
            <Helper>
              Set environment variables for your secrets and environment-specific
              configuration.
            </Helper>
            <EnvGroupArray
              namespace={this.state.selectedNamespace}
              values={this.state.envVariables}
              setValues={(x: any) => this.setState({ envVariables: x })}
              fileUpload={true}
              secretOption={true}
            />
          </Wrapper>
          <SaveButton
            disabled={this.isDisabled()}
            text="Create env group"
            clearPosition={true}
            statusPosition="right"
            onClick={this?.context?.currentProject.simplified_view_enabled ? this.createEnv : this.onSubmit}
            status={
              this.isDisabled()
                ? "Missing required fields"
                : this.state.submitStatus
            }
            makeFlush={true}
          />
        </StyledCreateEnvGroup>
        <Buffer />
      </>
    );
  }
}

CreateEnvGroup.contextType = Context;

const Wrapper = styled.div`
  padding: 30px;
  padding-bottom: 25px;
  border-radius: 5px;
  margin-top: -15px;
  background: ${props => props.theme.fg};
  border: 1px solid #494b4f;
  margin-bottom: 30px;
`;

const Buffer = styled.div`
  width: 100%;
  height: 150px;
`;

const StyledCreateEnvGroup = styled.div`
  padding-bottom: 70px;
  position: relative;
`;

const NamespaceLabel = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
  > i {
    font-size: 16px;
    margin-right: 6px;
  }
`;

const DestinationSection = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-family: "Work Sans", sans-serif;
  font-size: 14px;
  margin-top: 2px;
  font-weight: 500;
  margin-bottom: 32px;

  > i {
    font-size: 25px;
    color: #ffffff44;
    margin-right: 13px;
  }
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  margin-left: -2px;
  padding: 0px 8px;
  padding-bottom: 1px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  border: 2px solid #969fbbaa;
  :hover {
    background: #ffffff11;
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    color: #969fbbaa;
    font-weight: 600;
    font-size: 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

const Warning = styled.span<{ highlight: boolean; makeFlush?: boolean }>`
  color: ${(props) => (props.highlight ? "#f5cb42" : "")};
  margin-left: ${(props) => (props.makeFlush ? "" : "5px")};
`;

const Subtitle = styled.div`
  padding: 11px 0px 16px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
  display: flex;
  align-items: center;
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  margin-left: 15px;
  border-radius: 2px;
  color: #ffffff;
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 40px;

  > i {
    cursor: pointer;
    font-size: 20px;
    color: #969fbbaa;
    padding: 2px;
    border: 2px solid #969fbbaa;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }

  > img {
    width: 20px;
    margin-left: 17px;
    margin-right: 7px;
  }
`;

const Heading = styled.div<{ isAtTop?: boolean }>`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 5px;
  margin-top: ${(props) => (props.isAtTop ? "10px" : "30px")};
  display: flex;
  align-items: center;
`;
