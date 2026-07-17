import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Plus, Trash2 } from "lucide-react";
import type { LevelIIISecondaryTabPanelProps } from "./LevelIIISecondaryTabShared";

type LevelIIIActivitiesTabContentProps = {
  props: LevelIIISecondaryTabPanelProps;
};

export function LevelIIIActivitiesTabContent({ props }: LevelIIIActivitiesTabContentProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Record visits, calls, emails, and follow-up actions for each Level III client.
          </CardDescription>
        </div>
        <Button onClick={props.openAddActivity} disabled={props.clients.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Log Activity
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="activitySearch">Quick Search</Label>
            <Input
              id="activitySearch"
              value={props.activitySearch}
              onChange={(event) => props.setActivitySearch(event.target.value)}
              placeholder="Search company, subject, type, or status..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activityClientFilter">Filter By Client</Label>
            <select
              id="activityClientFilter"
              value={props.selectedActivityClientFilter}
              onChange={(event) => props.setSelectedActivityClientFilter(event.target.value)}
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
          columns={props.activityColumns}
          data={props.filteredActivities}
          isLoading={props.activitiesLoading}
          searchPlaceholder="Search activities..."
          actions={(row) => (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => props.editActivity(row)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void props.deleteActivity(row)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
