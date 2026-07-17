import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Edit2, Plus, Search, Trash2, Upload } from "lucide-react";
import type { LevelIIISecondaryTabPanelProps } from "./LevelIIISecondaryTabShared";

type LevelIIIClientsTabContentProps = {
  props: LevelIIISecondaryTabPanelProps;
};

export function LevelIIIClientsTabContent({ props }: LevelIIIClientsTabContentProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Client Register</CardTitle>
          <CardDescription>
            Keep company details, primary contact details, visit cadence, and procedure review dates.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={props.openClientImport}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={props.downloadClientImportTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Import Template
          </Button>
          <Button variant="outline" onClick={props.exportClientsCsv} disabled={props.filteredClients.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          {props.hiddenLinkedBranchClientCount > 0 ? (
            <Button variant="outline" onClick={props.toggleShowLinkedBranchClients}>
              {props.showLinkedBranchClients
                ? "Hide Linked Branch Records"
                : `Show Linked Branch Records (${props.hiddenLinkedBranchClientCount})`}
            </Button>
          ) : null}
          <Button onClick={props.openAddClient}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.hiddenLinkedBranchClientCount > 0 ? (
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {props.showLinkedBranchClients
              ? "Legacy client records linked under a head office as branches are visible for review."
              : `${props.hiddenLinkedBranchClientCount} linked branch client record${
                  props.hiddenLinkedBranchClientCount === 1 ? "" : "s"
                } ${props.hiddenLinkedBranchClientCount === 1 ? "is" : "are"} hidden from the normal register so your head office list stays clean.`}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={props.clientSearch}
            onChange={(event) => props.setClientSearch(event.target.value)}
            placeholder="Search by company, contact, email, or address..."
          />
        </div>
        <DataTable
          columns={props.clientColumns}
          data={props.filteredClients}
          isLoading={props.clientsLoading}
          searchPlaceholder="Search clients..."
          actions={(row) => (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => props.editClient(row)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              {!row.linkedBranchInfo ? (
                <Button variant="ghost" size="sm" onClick={() => void props.deleteClient(row)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
