import { lazy, Suspense } from "react";
import { TabsContent } from "@/components/ui/tabs";

const LevelIIISecondaryTabsShell = lazy(() =>
  import("./levelIII/LevelIIISecondaryTabsShell").then((module) => ({
    default: module.LevelIIISecondaryTabsShell,
  }))
);

const LevelIIITechniciansTabPanel = lazy(() =>
  import("./levelIII/LevelIIITechniciansTabPanel").then((module) => ({
    default: module.LevelIIITechniciansTabPanel,
  }))
);

const PortalRequestsPanel = lazy(() =>
  import("./levelIII/PortalRequestsPanel").then((module) => ({
    default: module.PortalRequestsPanel,
  }))
);

interface LevelIIITabPanelsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export function LevelIIITabPanels({ data }: LevelIIITabPanelsProps) {
  return (
    <>
      <Suspense fallback={null}>
        <LevelIIISecondaryTabsShell props={data} />
      </Suspense>

      <TabsContent value="technicians" className="space-y-4">
        {data.activeTab === "technicians" ? (
          <Suspense fallback={null}>
            <LevelIIITechniciansTabPanel {...data} />
          </Suspense>
        ) : null}
      </TabsContent>

      <TabsContent value="portalRequests" className="space-y-4">
        <Suspense fallback={null}>
          <PortalRequestsPanel {...data} />
        </Suspense>
      </TabsContent>
    </>
  );
}
