import type { Column } from "@/components/DataTable";
import type { ReactNode } from "react";

export type Mode =
  | "clients"
  | "activities"
  | "assessments"
  | "equipment"
  | "specimens"
  | "reminders";

export type RowActionHandler<T> = (row: T) => void | Promise<void>;

export type LevelIIISecondaryTabPanelProps = {
  mode: Mode;
  clients: any[];
  filteredClients: any[];
  clientsLoading: boolean;
  clientColumns: Column<any>[];
  clientSearch: string;
  setClientSearch: (value: string) => void;
  hiddenLinkedBranchClientCount: number;
  showLinkedBranchClients: boolean;
  toggleShowLinkedBranchClients: () => void;
  openClientImport: () => void;
  downloadClientImportTemplate: () => void;
  exportClientsCsv: () => void;
  openAddClient: () => void;
  editClient: RowActionHandler<any>;
  deleteClient: RowActionHandler<any>;
  filteredActivities: any[];
  activitiesLoading: boolean;
  activityColumns: Column<any>[];
  activitySearch: string;
  setActivitySearch: (value: string) => void;
  selectedActivityClientFilter: string;
  setSelectedActivityClientFilter: (value: string) => void;
  openAddActivity: () => void;
  editActivity: RowActionHandler<any>;
  deleteActivity: RowActionHandler<any>;
  filteredAssessments: any[];
  assessmentsLoading: boolean;
  assessmentColumns: Column<any>[];
  assessmentSearch: string;
  setAssessmentSearch: (value: string) => void;
  selectedAssessmentClientFilter: string;
  setSelectedAssessmentClientFilter: (value: string) => void;
  disableAddAssessment: boolean;
  openAddAssessment: () => void;
  issueAssessmentCertificate: RowActionHandler<any>;
  editAssessment: RowActionHandler<any>;
  deleteAssessment: RowActionHandler<any>;
  filteredEquipment: any[];
  equipmentLoading: boolean;
  equipmentColumns: Column<any>[];
  equipmentFilter: string;
  setEquipmentFilter: (value: string) => void;
  openEquipmentImport: () => void;
  downloadEquipmentImportTemplate: () => void;
  exportEquipmentCsv: () => void;
  openAddEquipment: () => void;
  editEquipment: RowActionHandler<any>;
  deleteEquipment: RowActionHandler<any>;
  filteredSpecimens: any[];
  specimensLoading: boolean;
  specimenColumns: Column<any>[];
  specimenFilter: string;
  setSpecimenFilter: (value: string) => void;
  openSpecimenImport: () => void;
  downloadSpecimenImportTemplate: () => void;
  exportSpecimensCsv: () => void;
  openAddSpecimen: () => void;
  editSpecimen: RowActionHandler<any>;
  deleteSpecimen: RowActionHandler<any>;
  reminderItems: any[];
  getDueBadge: (dateValue: string | Date | null) => ReactNode;
};
