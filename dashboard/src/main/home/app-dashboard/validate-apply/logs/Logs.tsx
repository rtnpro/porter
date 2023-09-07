import React, {
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

import styled from "styled-components";

import spinner from "assets/loading.gif";
import api from "shared/api";
import { useLogs } from "./utils";
import { Direction, GenericFilterOption, GenericLogFilter, LogFilterName, LogFilterQueryParamOpts } from "../../expanded-app/logs/types";
import dayjs, { Dayjs } from "dayjs";
import Loading from "components/Loading";
import _ from "lodash";
import Banner from "components/porter/Banner";
import LogSearchBar from "components/LogSearchBar";
import LogQueryModeSelectionToggle from "components/LogQueryModeSelectionToggle";
import Fieldset from "components/porter/Fieldset";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Container from "components/porter/Container";
import Button from "components/porter/Button";
import { Service } from "../../new-app-flow/serviceTypes";
import LogFilterContainer from "../../expanded-app/logs/LogFilterContainer";
import StyledLogs from "../../expanded-app/logs/StyledLogs";
import {z} from "zod";
import {AppRevision, appRevisionValidator} from "lib/revisions/types";
import {useLatestRevisionNumber, useRevisionIdToNumber} from "lib/hooks/useRevisionList";

type Props = {
    projectId: number;
    clusterId: number;
    appName: string;
    serviceNames: string[];
    deploymentTargetId: string;
    latestRevision: AppRevision;
};

const Logs: React.FC<Props> = ({
    projectId,
    clusterId,
    appName,
    serviceNames,
    deploymentTargetId,
    latestRevision,
}) => {
    const scrollToBottomRef = useRef<HTMLDivElement | undefined>(undefined);
    const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(true);
    const [enteredSearchText, setEnteredSearchText] = useState("");
    const [searchText, setSearchText] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [notification, setNotification] = useState<string>();

    const [hasPorterAgent, setHasPorterAgent] = useState(true);
    const [isPorterAgentInstalling, setIsPorterAgentInstalling] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [logsError, setLogsError] = useState<string | undefined>(undefined);

    const [selectedFilterValues, setSelectedFilterValues] = useState<Record<LogFilterName, string>>({
        service_name:  GenericLogFilter.getDefaultOption("service_name").value,
        pod_name: "", // not supported
        revision: GenericLogFilter.getDefaultOption("revision").value,
        output_stream: GenericLogFilter.getDefaultOption("output_stream").value,
    });

    const revisionIdToNumber = useRevisionIdToNumber(appName, deploymentTargetId)
    const latestRevisionNumber = useLatestRevisionNumber(appName, deploymentTargetId)

    const isAgentVersionUpdated = (agentImage: string | undefined) => {
        if (agentImage == null) {
            return false;
        }
        const version = agentImage.split(":").pop();
        if (version === "dev") {
            return true;
        }
        //make sure version is above v3.1.3
        if (version == null) {
            return false;
        }
        const versionParts = version.split(".");
        if (versionParts.length < 3) {
            return false;
        }
        const major = parseInt(versionParts[0]);
        const minor = parseInt(versionParts[1]);
        const patch = parseInt(versionParts[2]);
        if (major < 3) {
            return false;
        } else if (major > 3) {
            return true;
        }
        if (minor < 1) {
            return false;
        } else if (minor > 1) {
            return true;
        }
        return patch >= 7;
    }

    const createVersionOptions = (number: number) => {
        return Array.from({ length: number }, (_, index) => {
            const version = index + 1;
            const label = version === number ? `Version ${version} (latest)` : `Version ${version}`;
            const value = version.toString();
            return GenericFilterOption.of(label, value);
        }).reverse().slice(0, 3);
    }

    const [filters, setFilters] = useState<GenericLogFilter[]>([
        {
            name: "service_name",
            displayName: "Service",
            default: GenericLogFilter.getDefaultOption("service_name"),
            options: serviceNames.map(s => {
                return GenericFilterOption.of(s, s)
            }) ?? [],
            setValue: (value: string) => {
                setSelectedFilterValues((s) => ({
                    ...s,
                    service_name: value,
                }));
            }
        },
        {
            name: "revision",
            displayName: "Version",
            default: GenericLogFilter.getDefaultOption("revision"),
            options: createVersionOptions(latestRevisionNumber),
            setValue: (value: string) => {
                setSelectedFilterValues((s) => ({
                    ...s,
                    revision: value,
                }));
            }
        },
        {
            name: "output_stream",
            displayName: "Output Stream",
            default: GenericLogFilter.getDefaultOption("output_stream"),
            options: [
                GenericFilterOption.of('stdout', 'stdout'),
                GenericFilterOption.of("stderr", "stderr"),
            ],
            setValue: (value: string) => {
                setSelectedFilterValues((s) => ({
                    ...s,
                    output_stream: value,
                }));
            }
        },
    ]);

    const notify = (message: string) => {
        setNotification(message);

        setTimeout(() => {
            setNotification(undefined);
        }, 5000);
    };

    const { logs, refresh, moveCursor, paginationInfo } = useLogs(
        projectId,
        clusterId,
        selectedFilterValues,
        appName,
        selectedFilterValues.service_name,
        deploymentTargetId,
        enteredSearchText,
        notify,
        setIsLoading,
        revisionIdToNumber,
        selectedDate,
    );

    useEffect(() => {
        setFilters([
            {
                name: "service_name",
                displayName: "Service",
                default: GenericLogFilter.getDefaultOption("service_name"),
                options: serviceNames.map(s => {
                    return GenericFilterOption.of(s, s)
                }) ?? [],
                setValue: (value: string) => {
                    setSelectedFilterValues((s) => ({
                        ...s,
                        service_name: value,
                    }));
                }
            },
            {
                name: "revision",
                displayName: "Version",
                default: GenericLogFilter.getDefaultOption("revision"),
                options: createVersionOptions(latestRevisionNumber),
                setValue: (value: string) => {
                    setSelectedFilterValues((s) => ({
                        ...s,
                        revision: value,
                    }));
                }
            },
            {
                name: "output_stream",
                displayName: "Output Stream",
                default: GenericLogFilter.getDefaultOption("output_stream"),
                options: [
                    GenericFilterOption.of('stdout', 'stdout'),
                    GenericFilterOption.of("stderr", "stderr"),
                ],
                setValue: (value: string) => {
                    setSelectedFilterValues((s) => ({
                        ...s,
                        output_stream: value,
                    }));
                }
            },
        ])
    }, [latestRevisionNumber]);

    useEffect(() => {
        if (!isLoading && scrollToBottomRef.current && scrollToBottomEnabled) {
            const scrollPosition = scrollToBottomRef.current.offsetTop + scrollToBottomRef.current.offsetHeight - window.innerHeight;
            scrollToBottomRef.current.scrollIntoView({
                behavior: "smooth",
                top: scrollPosition,
            });
        }
    }, [isLoading, logs, scrollToBottomRef, scrollToBottomEnabled]);


    const resetFilters = () => {
        setSelectedFilterValues({
            output_stream: GenericLogFilter.getDefaultOption("output_stream").value,
            pod_name: "", // not supported
            revision: GenericLogFilter.getDefaultOption("revision").value,
            service_name: GenericLogFilter.getDefaultOption("service_name").value,
        });
    };

    const onLoadPrevious = useCallback(() => {
        if (!selectedDate) {
            setSelectedDate(dayjs(logs[0].timestamp).toDate());
            return;
        }

        moveCursor(Direction.backward);
    }, [logs, selectedDate]);

    const resetSearch = () => {
        setSearchText("");
        setEnteredSearchText("");
        resetFilters();
    };

    const setSelectedDateIfUndefined = () => {
        if (selectedDate == null) {
            setSelectedDate(dayjs().toDate());
        }
    };

    const renderContents = () => {
        return (
            <>
                <FlexRow>
                    <Flex>
                        <LogSearchBar
                            searchText={searchText}
                            setSearchText={setSearchText}
                            setEnteredSearchText={setEnteredSearchText}
                            setSelectedDate={setSelectedDateIfUndefined}
                        />
                        <LogQueryModeSelectionToggle
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            resetSearch={resetSearch}
                        />
                    </Flex>
                    <Flex>
                        <ScrollButton onClick={() => setScrollToBottomEnabled((s) => !s)}>
                            <Checkbox checked={scrollToBottomEnabled}>
                                <i className="material-icons">done</i>
                            </Checkbox>
                            Scroll to bottom
                        </ScrollButton>
                        <Spacer inline width="10px" />
                        <ScrollButton
                            onClick={() => {
                                refresh();
                            }}
                        >
                            <i className="material-icons">autorenew</i>
                            Refresh
                        </ScrollButton>
                    </Flex>
                </FlexRow>
                <Spacer y={0.5} />
                <>
                    <LogFilterContainer
                        filters={filters}
                        selectedFilterValues={selectedFilterValues}
                    />
                    <Spacer y={0.5} />
                </>
                <LogsSectionWrapper>
                    <StyledLogsSection>
                        {isLoading && <Loading message="Waiting for logs..." />}
                        {!isLoading && logs.length !== 0 && (
                            <>
                                <LoadMoreButton
                                    active={
                                        logs.length !== 0 && paginationInfo.previousCursor !== null
                                    }
                                    role="button"
                                    onClick={onLoadPrevious}
                                >
                                    Load Previous
                                </LoadMoreButton>
                                <StyledLogs
                                    logs={logs}
                                    filters={filters}
                                    appName={appName}
                                />
                                <LoadMoreButton
                                    active={selectedDate && logs.length !== 0}
                                    role="button"
                                    onClick={() => moveCursor(Direction.forward)}
                                >
                                    Load more
                                </LoadMoreButton>
                            </>
                        )}
                        {!isLoading && logs.length === 0 && selectedDate != null && (
                            <Message>
                                No logs found for this time range.
                                <Highlight onClick={() => setSelectedDate(undefined)}>
                                    <i className="material-icons">autorenew</i>
                                    Reset
                                </Highlight>
                            </Message>
                        )}
                        {!isLoading && logs.length === 0 && selectedDate == null && (
                            <Loading message="Waiting for logs..." />
                        )}
                        <div ref={scrollToBottomRef} />
                    </StyledLogsSection>
                    <NotificationWrapper
                        key={JSON.stringify(logs)}
                        active={!!notification}
                    >
                        <Banner>{notification}</Banner>
                    </NotificationWrapper>
                </LogsSectionWrapper>
            </>
        );
    };

    useEffect(() => {
        // determine if the agent is installed properly - if not, start by render upgrade screen
        checkForAgent();
    }, []);

    useEffect(() => {
        if (!isPorterAgentInstalling) {
            return;
        }

        const checkForAgentInterval = setInterval(checkForAgent, 3000);

        return () => clearInterval(checkForAgentInterval);
    }, [isPorterAgentInstalling]);

    const checkForAgent = async () => {
        const project_id = projectId
        const cluster_id = clusterId

        try {
            const res = await api.detectPorterAgent("<token>", {}, { project_id, cluster_id });

            setHasPorterAgent(true);

            const agentImage = res.data?.image;
            if (!isAgentVersionUpdated(agentImage)) {
                notify("Porter agent is outdated. Please upgrade to see logs.");
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setHasPorterAgent(false);
            }
        }
    };

    const installAgent = async () => {
        const project_id = projectId;
        const cluster_id = clusterId;

        setIsPorterAgentInstalling(true);

        api
            .installPorterAgent("<token>", {}, { project_id, cluster_id })
            .then()
            .catch((err) => {
                setIsPorterAgentInstalling(false);
                console.log(err);
            });
    };

    const triggerInstall = () => {
        installAgent();
    };

    return isPorterAgentInstalling ? (
        <Fieldset>
            <Container row>
                <Spinner src={spinner} />
                <Spacer inline x={1} />
                <Text color="helper">The Porter agent is being installed . . .</Text>
            </Container>
        </Fieldset>
    ) : !hasPorterAgent ? (
        <Fieldset>
            <Text size={16}>We couldn't detect the Porter agent on your cluster</Text>
            <Spacer y={0.5} />
            <Text color="helper">
                In order to use the Logs tab, you need to install the Porter agent.
            </Text>
            <Spacer y={1} />
            <Button onClick={() => triggerInstall()}>
                <I className="material-icons">add</I> Install Porter agent
            </Button>
        </Fieldset>
    ) : logsError ? (
        <Fieldset>
            <Container row>
                <WarnI className="material-icons">warning</WarnI>
                <Text color="helper">
                    Porter encountered an error retrieving logs for this application.
                </Text>
            </Container>
        </Fieldset>
    ) : (
        renderContents()
    );
};

export default Logs;

const I = styled.i`
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const WarnI = styled.i`
  font-size: 18px;
  display: flex;
  align-items: center;
  margin-right: 10px;
  justify-content: center;
  opacity: 0.6;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
`;

const Checkbox = styled.div<{ checked: boolean }>`
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff55;
  margin: 1px 10px 0px 1px;
  border-radius: 3px;
  background: ${(props) => (props.checked ? "#ffffff22" : "#ffffff11")};
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props) => (props.checked ? "" : "none")};
  }
`;

const ScrollButton = styled.div`
  background: #26292e;
  border-radius: 5px;
  height: 30px;
  font-size: 13px;
  display: flex;
  cursor: pointer;
  align-items: center;
  padding: 10px;
  padding-left: 8px;
  > i {
    font-size: 16px;
    margin-right: 5px;
  }
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const Message = styled.div`
  display: flex;
  height: 100%;
  width: calc(100% - 150px);
  align-items: center;
  justify-content: center;
  margin-left: 75px;
  text-align: center;
  color: #ffffff44;
  font-size: 13px;
`;

const Highlight = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: #8590ff;
  cursor: pointer;

  > i {
    font-size: 16px;
    margin-right: 3px;
  }
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const StyledLogsSection = styled.div`
  width: 100%;
  height: 600px;
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid #ffffff33;
  background: #000000;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  overflow-y: auto;
  overflow-wrap: break-word;
  position: relative;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const LoadMoreButton = styled.div<{ active: boolean }>`
  width: 100%;
  display: ${(props) => (props.active ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  padding-block: 10px;
  background: #1f2023;
  cursor: pointer;
  font-family: monospace;
`;

const NotificationWrapper = styled.div<{ active?: boolean }>`
  position: absolute;
  bottom: 10px;
  display: ${(props) => (props.active ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  left: 50%;
  transform: translateX(-50%);
  width: fit-content;
  background: #101420;
  z-index: 9999;

  @keyframes bounceIn {
    0% {
      transform: translateZ(-1400px);
      opacity: 0;
    }
    100% {
      transform: translateZ(0);
      opacity: 1;
    }
  }
`;

const LogsSectionWrapper = styled.div`
  position: relative;
`;