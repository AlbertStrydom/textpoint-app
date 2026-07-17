import { lazy, Suspense } from "react";

const LevelIIIPortalRequestManagementDialog = lazy(() =>
  import("./levelIII/LevelIIIPortalRequestManagementDialog").then((module) => ({
    default: module.LevelIIIPortalRequestManagementDialog,
  }))
);

const LevelIIIClientActivityDialogs = lazy(() =>
  import("./levelIII/LevelIIIClientActivityDialogs").then((module) => ({
    default: module.LevelIIIClientActivityDialogs,
  }))
);

const LevelIIITechnicianDialog = lazy(() =>
  import("./levelIII/LevelIIITechnicianDialog").then((module) => ({
    default: module.LevelIIITechnicianDialog,
  }))
);

const LevelIIITechnicianEntryDialogs = lazy(() =>
  import("./levelIII/LevelIIITechnicianEntryDialogs").then((module) => ({
    default: module.LevelIIITechnicianEntryDialogs,
  }))
);

const LevelIIITechnicianWorkflowDialogs = lazy(() =>
  import("./levelIII/LevelIIITechnicianWorkflowDialogs").then((module) => ({
    default: module.LevelIIITechnicianWorkflowDialogs,
  }))
);

const LevelIIITechnicianComplianceDialogs = lazy(() =>
  import("./levelIII/LevelIIITechnicianComplianceDialogs").then((module) => ({
    default: module.LevelIIITechnicianComplianceDialogs,
  }))
);

const LevelIIIImportDialogs = lazy(() =>
  import("./levelIII/LevelIIIImportDialogs").then((module) => ({
    default: module.LevelIIIImportDialogs,
  }))
);

const LevelIIIAssetDialogs = lazy(() =>
  import("./levelIII/LevelIIIAssetDialogs").then((module) => ({
    default: module.LevelIIIAssetDialogs,
  }))
);

interface LevelIIIDialogsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export function LevelIIIDialogs({ data }: LevelIIIDialogsProps) {
  return (
    <>
      <Suspense fallback={null}>
        <LevelIIIPortalRequestManagementDialog {...data} />
      </Suspense>
      <Suspense fallback={null}>
        <LevelIIIClientActivityDialogs {...data} />
      </Suspense>
      <Suspense fallback={null}>
        <LevelIIITechnicianDialog {...data} />
      </Suspense>
      <Suspense fallback={null}>
        <LevelIIITechnicianEntryDialogs {...data} />
      </Suspense>
      <Suspense fallback={null}>
        <LevelIIITechnicianWorkflowDialogs {...data} />
      </Suspense>
      <Suspense fallback={null}>
        <LevelIIITechnicianComplianceDialogs {...data} />
      </Suspense>
      <Suspense fallback={null}>
        <LevelIIIImportDialogs {...data} />
      </Suspense>
      <Suspense fallback={null}>
        <LevelIIIAssetDialogs {...data} />
      </Suspense>
    </>
  );
}
