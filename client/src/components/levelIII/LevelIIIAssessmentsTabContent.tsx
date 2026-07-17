import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Plus, Trash2 } from "lucide-react";
import type { LevelIIISecondaryTabPanelProps } from "./LevelIIISecondaryTabShared";

type LevelIIIAssessmentsTabContentProps = {
  props: LevelIIISecondaryTabPanelProps;
};

export function LevelIIIAssessmentsTabContent({ props }: LevelIIIAssessmentsTabContentProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Technician Assessments</CardTitle>
          <CardDescription>
            Track Level III client technician assessments, findings, evidence links, and review dates.
          </CardDescription>
        </div>
        <Button onClick={props.openAddAssessment} disabled={props.disableAddAssessment}>
          <Plus className="mr-2 h-4 w-4" />
          Add Assessment
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="assessmentSearch">Quick Search</Label>
            <Input
              id="assessmentSearch"
              value={props.assessmentSearch}
              onChange={(event) => props.setAssessmentSearch(event.target.value)}
              placeholder="Search technician, company, method, result, or assessor..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assessmentClientFilter">Filter By Client</Label>
            <select
              id="assessmentClientFilter"
              value={props.selectedAssessmentClientFilter}
              onChange={(event) => props.setSelectedAssessmentClientFilter(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Clients</option>
              {props.clients.map((client) => (
                <option key={client.id} value={String(client.id)}>
                  {client.companyName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={props.assessmentColumns}
          data={props.filteredAssessments}
          isLoading={props.assessmentsLoading}
          searchPlaceholder="Search assessments..."
          actions={(row) => (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => props.issueAssessmentCertificate(row)}>
                Issue Cert
              </Button>
              <Button variant="ghost" size="sm" onClick={() => props.editAssessment(row)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void props.deleteAssessment(row)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
