import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Download, Edit2, Plus, Trash2, Upload } from "lucide-react";
import type { LevelIIISecondaryTabPanelProps, Mode } from "./LevelIIISecondaryTabShared";

type LevelIIIAssetsTabContentProps = {
  mode: Extract<Mode, "equipment" | "specimens">;
  props: LevelIIISecondaryTabPanelProps;
};

export function LevelIIIAssetsTabContent({ mode, props }: LevelIIIAssetsTabContentProps) {
  const isEquipment = mode === "equipment";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{isEquipment ? "Level III Equipment" : "Level III Specimens"}</CardTitle>
          <CardDescription>
            {isEquipment
              ? "Dedicated Level III equipment lives here. Shared equipment should be marked as shared."
              : "Track dedicated Level III specimens and note which specimens are shared or borrowed."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={isEquipment ? props.openEquipmentImport : props.openSpecimenImport}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={
              isEquipment ? props.downloadEquipmentImportTemplate : props.downloadSpecimenImportTemplate
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Import Template
          </Button>
          <Button
            variant="outline"
            onClick={isEquipment ? props.exportEquipmentCsv : props.exportSpecimensCsv}
            disabled={isEquipment ? props.filteredEquipment.length === 0 : props.filteredSpecimens.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={isEquipment ? props.openAddEquipment : props.openAddSpecimen}>
            <Plus className="mr-2 h-4 w-4" />
            {isEquipment ? "Add Equipment" : "Add Specimen"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Label htmlFor={`leveliii-${mode}-filter`} className="text-sm">
            Filter
          </Label>
          <select
            id={`leveliii-${mode}-filter`}
            value={isEquipment ? props.equipmentFilter : props.specimenFilter}
            onChange={(event) =>
              isEquipment
                ? props.setEquipmentFilter(event.target.value)
                : props.setSpecimenFilter(event.target.value)
            }
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All {isEquipment ? "Equipment" : "Specimens"}</option>
            <option value="dedicated">Level III Only</option>
            <option value="shared">Shared / Borrowed</option>
          </select>
        </div>
        <DataTable
          columns={isEquipment ? props.equipmentColumns : props.specimenColumns}
          data={isEquipment ? props.filteredEquipment : props.filteredSpecimens}
          isLoading={isEquipment ? props.equipmentLoading : props.specimensLoading}
          searchPlaceholder={isEquipment ? "Search equipment..." : "Search specimens..."}
          actions={(row) => (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  isEquipment ? props.editEquipment(row) : props.editSpecimen(row)
                }
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void (isEquipment ? props.deleteEquipment(row) : props.deleteSpecimen(row))
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
