import { Suspense, lazy } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const LevelIIISecondaryTabPanel = lazy(() =>
  import("@/components/levelIII/LevelIIISecondaryTabPanel").then((module) => ({
    default: module.LevelIIISecondaryTabPanel,
  }))
);

type LevelIIISecondaryTabsShellProps = {
  props: any;
};

export function LevelIIISecondaryTabsShell({ props }: LevelIIISecondaryTabsShellProps) {
  return (
    <>
      <TabsContent value="clients" className="space-y-4">
        {props.activeTab === "clients" ? (
          <Suspense fallback={null}>
            <LevelIIISecondaryTabPanel
              mode="clients"
              clients={props.clients}
              filteredClients={props.filteredClients}
              clientsLoading={props.clientsLoading}
              clientColumns={props.clientColumns}
              clientSearch={props.clientSearch}
              setClientSearch={props.setClientSearch}
              hiddenLinkedBranchClientCount={props.hiddenLinkedBranchClientCount}
              showLinkedBranchClients={props.showLinkedBranchClients}
              toggleShowLinkedBranchClients={props.toggleShowLinkedBranchClients}
              openClientImport={props.openClientImport}
              downloadClientImportTemplate={props.downloadClientImportTemplate}
              exportClientsCsv={props.exportClientsCsv}
              openAddClient={props.openAddClient}
              editClient={props.editClient}
              deleteClient={props.deleteClient}
              filteredActivities={[]}
              activitiesLoading={false}
              activityColumns={[]}
              activitySearch=""
              setActivitySearch={() => {}}
              selectedActivityClientFilter="all"
              setSelectedActivityClientFilter={() => {}}
              openAddActivity={() => {}}
              editActivity={() => {}}
              deleteActivity={() => {}}
              filteredAssessments={[]}
              assessmentsLoading={false}
              assessmentColumns={[]}
              assessmentSearch=""
              setAssessmentSearch={() => {}}
              selectedAssessmentClientFilter="all"
              setSelectedAssessmentClientFilter={() => {}}
              disableAddAssessment={false}
              openAddAssessment={() => {}}
              issueAssessmentCertificate={() => {}}
              editAssessment={() => {}}
              deleteAssessment={() => {}}
              filteredEquipment={[]}
              equipmentLoading={false}
              equipmentColumns={[]}
              equipmentFilter="all"
              setEquipmentFilter={() => {}}
              openEquipmentImport={() => {}}
              downloadEquipmentImportTemplate={() => {}}
              exportEquipmentCsv={() => {}}
              openAddEquipment={() => {}}
              editEquipment={() => {}}
              deleteEquipment={() => {}}
              filteredSpecimens={[]}
              specimensLoading={false}
              specimenColumns={[]}
              specimenFilter="all"
              setSpecimenFilter={() => {}}
              openSpecimenImport={() => {}}
              downloadSpecimenImportTemplate={() => {}}
              exportSpecimensCsv={() => {}}
              openAddSpecimen={() => {}}
              editSpecimen={() => {}}
              deleteSpecimen={() => {}}
              reminderItems={[]}
              getDueBadge={props.getDueBadge}
            />
          </Suspense>
        ) : null}
      </TabsContent>

      <TabsContent value="activities" className="space-y-4">
        {props.activeTab === "activities" ? (
          <Suspense fallback={null}>
            <LevelIIISecondaryTabPanel
              mode="activities"
              clients={props.clients}
              filteredClients={[]}
              clientsLoading={false}
              clientColumns={[]}
              clientSearch=""
              setClientSearch={() => {}}
              hiddenLinkedBranchClientCount={0}
              showLinkedBranchClients={false}
              toggleShowLinkedBranchClients={() => {}}
              openClientImport={() => {}}
              downloadClientImportTemplate={() => {}}
              exportClientsCsv={() => {}}
              openAddClient={() => {}}
              editClient={() => {}}
              deleteClient={() => {}}
              filteredActivities={props.filteredActivities}
              activitiesLoading={props.activitiesLoading}
              activityColumns={props.activityColumns}
              activitySearch={props.activitySearch}
              setActivitySearch={props.setActivitySearch}
              selectedActivityClientFilter={props.selectedActivityClientFilter}
              setSelectedActivityClientFilter={props.setSelectedActivityClientFilter}
              openAddActivity={props.openAddActivity}
              editActivity={props.editActivity}
              deleteActivity={props.deleteActivity}
              filteredAssessments={[]}
              assessmentsLoading={false}
              assessmentColumns={[]}
              assessmentSearch=""
              setAssessmentSearch={() => {}}
              selectedAssessmentClientFilter="all"
              setSelectedAssessmentClientFilter={() => {}}
              disableAddAssessment={false}
              openAddAssessment={() => {}}
              issueAssessmentCertificate={() => {}}
              editAssessment={() => {}}
              deleteAssessment={() => {}}
              filteredEquipment={[]}
              equipmentLoading={false}
              equipmentColumns={[]}
              equipmentFilter="all"
              setEquipmentFilter={() => {}}
              openEquipmentImport={() => {}}
              downloadEquipmentImportTemplate={() => {}}
              exportEquipmentCsv={() => {}}
              openAddEquipment={() => {}}
              editEquipment={() => {}}
              deleteEquipment={() => {}}
              filteredSpecimens={[]}
              specimensLoading={false}
              specimenColumns={[]}
              specimenFilter="all"
              setSpecimenFilter={() => {}}
              openSpecimenImport={() => {}}
              downloadSpecimenImportTemplate={() => {}}
              exportSpecimensCsv={() => {}}
              openAddSpecimen={() => {}}
              editSpecimen={() => {}}
              deleteSpecimen={() => {}}
              reminderItems={[]}
              getDueBadge={props.getDueBadge}
            />
          </Suspense>
        ) : null}
      </TabsContent>

      <TabsContent value="assessments" className="space-y-4">
        {props.activeTab === "assessments" ? (
          <Suspense fallback={null}>
            <LevelIIISecondaryTabPanel
              mode="assessments"
              clients={props.clients}
              filteredClients={[]}
              clientsLoading={false}
              clientColumns={[]}
              clientSearch=""
              setClientSearch={() => {}}
              hiddenLinkedBranchClientCount={0}
              showLinkedBranchClients={false}
              toggleShowLinkedBranchClients={() => {}}
              openClientImport={() => {}}
              downloadClientImportTemplate={() => {}}
              exportClientsCsv={() => {}}
              openAddClient={() => {}}
              editClient={() => {}}
              deleteClient={() => {}}
              filteredActivities={[]}
              activitiesLoading={false}
              activityColumns={[]}
              activitySearch=""
              setActivitySearch={() => {}}
              selectedActivityClientFilter="all"
              setSelectedActivityClientFilter={() => {}}
              openAddActivity={() => {}}
              editActivity={() => {}}
              deleteActivity={() => {}}
              filteredAssessments={props.filteredAssessments}
              assessmentsLoading={props.assessmentsLoading}
              assessmentColumns={props.assessmentColumns}
              assessmentSearch={props.assessmentSearch}
              setAssessmentSearch={props.setAssessmentSearch}
              selectedAssessmentClientFilter={props.selectedAssessmentClientFilter}
              setSelectedAssessmentClientFilter={props.setSelectedAssessmentClientFilter}
              disableAddAssessment={props.disableAddAssessment}
              openAddAssessment={props.openAddAssessment}
              issueAssessmentCertificate={props.issueAssessmentCertificate}
              editAssessment={props.editAssessment}
              deleteAssessment={props.deleteAssessment}
              filteredEquipment={[]}
              equipmentLoading={false}
              equipmentColumns={[]}
              equipmentFilter="all"
              setEquipmentFilter={() => {}}
              openEquipmentImport={() => {}}
              downloadEquipmentImportTemplate={() => {}}
              exportEquipmentCsv={() => {}}
              openAddEquipment={() => {}}
              editEquipment={() => {}}
              deleteEquipment={() => {}}
              filteredSpecimens={[]}
              specimensLoading={false}
              specimenColumns={[]}
              specimenFilter="all"
              setSpecimenFilter={() => {}}
              openSpecimenImport={() => {}}
              downloadSpecimenImportTemplate={() => {}}
              exportSpecimensCsv={() => {}}
              openAddSpecimen={() => {}}
              editSpecimen={() => {}}
              deleteSpecimen={() => {}}
              reminderItems={[]}
              getDueBadge={props.getDueBadge}
            />
          </Suspense>
        ) : null}
      </TabsContent>

      <TabsContent value="equipment" className="space-y-4">
        {props.activeTab === "equipment" ? (
          <Suspense fallback={null}>
            <LevelIIISecondaryTabPanel
              mode="equipment"
              clients={props.clients}
              filteredClients={[]}
              clientsLoading={false}
              clientColumns={[]}
              clientSearch=""
              setClientSearch={() => {}}
              hiddenLinkedBranchClientCount={0}
              showLinkedBranchClients={false}
              toggleShowLinkedBranchClients={() => {}}
              openClientImport={() => {}}
              downloadClientImportTemplate={() => {}}
              exportClientsCsv={() => {}}
              openAddClient={() => {}}
              editClient={() => {}}
              deleteClient={() => {}}
              filteredActivities={[]}
              activitiesLoading={false}
              activityColumns={[]}
              activitySearch=""
              setActivitySearch={() => {}}
              selectedActivityClientFilter="all"
              setSelectedActivityClientFilter={() => {}}
              openAddActivity={() => {}}
              editActivity={() => {}}
              deleteActivity={() => {}}
              filteredAssessments={[]}
              assessmentsLoading={false}
              assessmentColumns={[]}
              assessmentSearch=""
              setAssessmentSearch={() => {}}
              selectedAssessmentClientFilter="all"
              setSelectedAssessmentClientFilter={() => {}}
              disableAddAssessment={false}
              openAddAssessment={() => {}}
              issueAssessmentCertificate={() => {}}
              editAssessment={() => {}}
              deleteAssessment={() => {}}
              filteredEquipment={props.filteredEquipment}
              equipmentLoading={props.equipmentLoading}
              equipmentColumns={props.equipmentColumns}
              equipmentFilter={props.equipmentFilter}
              setEquipmentFilter={props.setEquipmentFilter}
              openEquipmentImport={props.openEquipmentImport}
              downloadEquipmentImportTemplate={props.downloadEquipmentImportTemplate}
              exportEquipmentCsv={props.exportEquipmentCsv}
              openAddEquipment={props.openAddEquipment}
              editEquipment={props.editEquipment}
              deleteEquipment={props.deleteEquipment}
              filteredSpecimens={[]}
              specimensLoading={false}
              specimenColumns={[]}
              specimenFilter="all"
              setSpecimenFilter={() => {}}
              openSpecimenImport={() => {}}
              downloadSpecimenImportTemplate={() => {}}
              exportSpecimensCsv={() => {}}
              openAddSpecimen={() => {}}
              editSpecimen={() => {}}
              deleteSpecimen={() => {}}
              reminderItems={[]}
              getDueBadge={props.getDueBadge}
            />
          </Suspense>
        ) : null}
      </TabsContent>

      <TabsContent value="specimens" className="space-y-4">
        {props.activeTab === "specimens" ? (
          <Suspense fallback={null}>
            <LevelIIISecondaryTabPanel
              mode="specimens"
              clients={props.clients}
              filteredClients={[]}
              clientsLoading={false}
              clientColumns={[]}
              clientSearch=""
              setClientSearch={() => {}}
              hiddenLinkedBranchClientCount={0}
              showLinkedBranchClients={false}
              toggleShowLinkedBranchClients={() => {}}
              openClientImport={() => {}}
              downloadClientImportTemplate={() => {}}
              exportClientsCsv={() => {}}
              openAddClient={() => {}}
              editClient={() => {}}
              deleteClient={() => {}}
              filteredActivities={[]}
              activitiesLoading={false}
              activityColumns={[]}
              activitySearch=""
              setActivitySearch={() => {}}
              selectedActivityClientFilter="all"
              setSelectedActivityClientFilter={() => {}}
              openAddActivity={() => {}}
              editActivity={() => {}}
              deleteActivity={() => {}}
              filteredAssessments={[]}
              assessmentsLoading={false}
              assessmentColumns={[]}
              assessmentSearch=""
              setAssessmentSearch={() => {}}
              selectedAssessmentClientFilter="all"
              setSelectedAssessmentClientFilter={() => {}}
              disableAddAssessment={false}
              openAddAssessment={() => {}}
              issueAssessmentCertificate={() => {}}
              editAssessment={() => {}}
              deleteAssessment={() => {}}
              filteredEquipment={[]}
              equipmentLoading={false}
              equipmentColumns={[]}
              equipmentFilter="all"
              setEquipmentFilter={() => {}}
              openEquipmentImport={() => {}}
              downloadEquipmentImportTemplate={() => {}}
              exportEquipmentCsv={() => {}}
              openAddEquipment={() => {}}
              editEquipment={() => {}}
              deleteEquipment={() => {}}
              filteredSpecimens={props.filteredSpecimens}
              specimensLoading={props.specimensLoading}
              specimenColumns={props.specimenColumns}
              specimenFilter={props.specimenFilter}
              setSpecimenFilter={props.setSpecimenFilter}
              openSpecimenImport={props.openSpecimenImport}
              downloadSpecimenImportTemplate={props.downloadSpecimenImportTemplate}
              exportSpecimensCsv={props.exportSpecimensCsv}
              openAddSpecimen={props.openAddSpecimen}
              editSpecimen={props.editSpecimen}
              deleteSpecimen={props.deleteSpecimen}
              reminderItems={[]}
              getDueBadge={props.getDueBadge}
            />
          </Suspense>
        ) : null}
      </TabsContent>

      <TabsContent value="reminders" className="space-y-4">
        {props.activeTab === "reminders" ? (
          <Suspense fallback={null}>
            <LevelIIISecondaryTabPanel
              mode="reminders"
              clients={[]}
              filteredClients={[]}
              clientsLoading={false}
              clientColumns={[]}
              clientSearch=""
              setClientSearch={() => {}}
              hiddenLinkedBranchClientCount={0}
              showLinkedBranchClients={false}
              toggleShowLinkedBranchClients={() => {}}
              openClientImport={() => {}}
              downloadClientImportTemplate={() => {}}
              exportClientsCsv={() => {}}
              openAddClient={() => {}}
              editClient={() => {}}
              deleteClient={() => {}}
              filteredActivities={[]}
              activitiesLoading={false}
              activityColumns={[]}
              activitySearch=""
              setActivitySearch={() => {}}
              selectedActivityClientFilter="all"
              setSelectedActivityClientFilter={() => {}}
              openAddActivity={() => {}}
              editActivity={() => {}}
              deleteActivity={() => {}}
              filteredAssessments={[]}
              assessmentsLoading={false}
              assessmentColumns={[]}
              assessmentSearch=""
              setAssessmentSearch={() => {}}
              selectedAssessmentClientFilter="all"
              setSelectedAssessmentClientFilter={() => {}}
              disableAddAssessment={false}
              openAddAssessment={() => {}}
              issueAssessmentCertificate={() => {}}
              editAssessment={() => {}}
              deleteAssessment={() => {}}
              filteredEquipment={[]}
              equipmentLoading={false}
              equipmentColumns={[]}
              equipmentFilter="all"
              setEquipmentFilter={() => {}}
              openEquipmentImport={() => {}}
              downloadEquipmentImportTemplate={() => {}}
              exportEquipmentCsv={() => {}}
              openAddEquipment={() => {}}
              editEquipment={() => {}}
              deleteEquipment={() => {}}
              filteredSpecimens={[]}
              specimensLoading={false}
              specimenColumns={[]}
              specimenFilter="all"
              setSpecimenFilter={() => {}}
              openSpecimenImport={() => {}}
              downloadSpecimenImportTemplate={() => {}}
              exportSpecimensCsv={() => {}}
              openAddSpecimen={() => {}}
              editSpecimen={() => {}}
              deleteSpecimen={() => {}}
              reminderItems={props.reminderItems}
              getDueBadge={props.getDueBadge}
            />
          </Suspense>
        ) : null}
      </TabsContent>
    </>
  );
}
