import { Suspense, lazy } from "react";
import type { LevelIIISecondaryTabPanelProps } from "./LevelIIISecondaryTabShared";

const LevelIIIClientsTabContent = lazy(() =>
  import("@/components/levelIII/LevelIIIClientsTabContent").then((module) => ({
    default: module.LevelIIIClientsTabContent,
  }))
);
const LevelIIIActivitiesTabContent = lazy(() =>
  import("@/components/levelIII/LevelIIIActivitiesTabContent").then((module) => ({
    default: module.LevelIIIActivitiesTabContent,
  }))
);
const LevelIIIAssessmentsTabContent = lazy(() =>
  import("@/components/levelIII/LevelIIIAssessmentsTabContent").then((module) => ({
    default: module.LevelIIIAssessmentsTabContent,
  }))
);
const LevelIIIAssetsTabContent = lazy(() =>
  import("@/components/levelIII/LevelIIIAssetsTabContent").then((module) => ({
    default: module.LevelIIIAssetsTabContent,
  }))
);
const LevelIIIRemindersTabContent = lazy(() =>
  import("@/components/levelIII/LevelIIIRemindersTabContent").then((module) => ({
    default: module.LevelIIIRemindersTabContent,
  }))
);

export function LevelIIISecondaryTabPanel(props: LevelIIISecondaryTabPanelProps) {
  if (props.mode === "clients") {
    return (
      <Suspense fallback={null}>
        <LevelIIIClientsTabContent props={props} />
      </Suspense>
    );
  }

  if (props.mode === "activities") {
    return (
      <Suspense fallback={null}>
        <LevelIIIActivitiesTabContent props={props} />
      </Suspense>
    );
  }

  if (props.mode === "assessments") {
    return (
      <Suspense fallback={null}>
        <LevelIIIAssessmentsTabContent props={props} />
      </Suspense>
    );
  }

  if (props.mode === "equipment" || props.mode === "specimens") {
    return (
      <Suspense fallback={null}>
        <LevelIIIAssetsTabContent mode={props.mode} props={props} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <LevelIIIRemindersTabContent props={props} />
    </Suspense>
  );
}

export default LevelIIISecondaryTabPanel;
