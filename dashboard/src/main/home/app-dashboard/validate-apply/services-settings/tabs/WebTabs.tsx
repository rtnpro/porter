import React from "react";
import TabSelector from "components/TabSelector";

import { ClientService } from "lib/porter-apps/services";
import { match } from "ts-pattern";
import Networking from "./Networking";
import MainTab from "./Main";
import Resources from "./Resources";
import Health from "./Health";

interface Props {
  index: number;
  service: ClientService & {
    config: {
      type: "web";
    };
  };
  chart?: any;
  maxRAM: number;
  maxCPU: number;
  clusterContainsGPUNodes: boolean;
  internalNetworkingDetails: {
    namespace: string;
    appName: string;
  };
}

const WebTabs: React.FC<Props> = ({ index, service, maxRAM, maxCPU, clusterContainsGPUNodes, internalNetworkingDetails }) => {
  const [currentTab, setCurrentTab] = React.useState<
    "main" | "resources" | "networking" | "advanced"
  >("main");

  return (
    <>
      <TabSelector
        options={[
          { label: "Main", value: "main" },
          { label: "Resources", value: "resources" },
          { label: "Networking", value: "networking" },
          { label: "Advanced", value: "advanced" },
        ]}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      {match(currentTab)
        .with("main", () => <MainTab index={index} service={service} />)
        .with("networking", () => (
          <Networking
            index={index}
            service={service}
            internalNetworkingDetails={internalNetworkingDetails}
          />
        ))
        .with("resources", () => (
          <Resources
            index={index}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
            clusterContainsGPUNodes={clusterContainsGPUNodes}
            service={service}
          />
        ))
        .with("advanced", () => <Health index={index} service={service} />)
        .exhaustive()}
    </>
  );
};

export default WebTabs;
