import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";

export interface ImportDialogMeta {
  fileName: string | null;
  sourceColumns: string[];
  columnMapping: Record<string, string>;
}

export interface ImportDialogResult {
  count?: number;
  successCount?: number;
  failureCount?: number;
  message?: string;
}

export interface ImportDialogTargetField {
  key: string;
  label: string;
  required: boolean;
  aliases?: string[];
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  targetFields: ImportDialogTargetField[];
  onImport: (data: any[], meta: ImportDialogMeta) => Promise<ImportDialogResult | void>;
}

type Step = "upload" | "preview" | "mapping" | "confirm" | "importing";
const SKIP_FIELD_VALUE = "__skip__";

let csvParserModulePromise: Promise<typeof import("papaparse")> | null = null;
let spreadsheetParserModulePromise: Promise<typeof import("xlsx")> | null = null;

function normaliseImportToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function loadCsvParser() {
  if (!csvParserModulePromise) {
    csvParserModulePromise = import("papaparse");
  }
  return csvParserModulePromise;
}

function loadSpreadsheetParser() {
  if (!spreadsheetParserModulePromise) {
    spreadsheetParserModulePromise = import("xlsx");
  }
  return spreadsheetParserModulePromise;
}

export function ImportDialog({
  open,
  onOpenChange,
  title,
  description,
  targetFields,
  onImport,
}: ImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setFile(selectedFile);
    setImportResults(null);

    const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls");
    const isCSV = selectedFile.name.endsWith(".csv");

    if (!isExcel && !isCSV) {
      setError("Please upload a CSV or Excel file");
      return;
    }

    if (isExcel) {
      const xlsx = await loadSpreadsheetParser();
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = xlsx.read(data, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = xlsx.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            setError("File is empty or invalid");
            return;
          }

          setRawData(jsonData as any[]);
          setSourceColumns(Object.keys(jsonData[0] || {}));
          initializeMapping(Object.keys(jsonData[0] || {}));
          setStep("preview");
        } catch (err) {
          setError(`Failed to parse Excel file: ${String(err)}`);
        }
      };
      reader.readAsBinaryString(selectedFile);
    } else {
      const papa = await loadCsvParser();
      papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results: { data: Record<string, unknown>[] }) => {
          if (results.data.length === 0) {
            setError("File is empty or invalid");
            return;
          }
          setRawData(results.data as any[]);
          setSourceColumns(Object.keys(results.data[0] || {}));
          initializeMapping(Object.keys(results.data[0] || {}));
          setStep("preview");
        },
        error: (error: { message: string }) => {
          setError(`Failed to parse file: ${error.message}`);
        },
      });
    }
  };

  const initializeMapping = (columns: string[]) => {
    const mapping: Record<string, string> = {};
    const normalisedColumns = columns.map((column) => ({
      original: column,
      normalised: normaliseImportToken(column),
    }));

    targetFields.forEach((field) => {
      const candidateTokens = [
        field.key,
        field.label,
        ...(field.aliases ?? []),
      ]
        .map(normaliseImportToken)
        .filter(Boolean);

      const match = normalisedColumns.find(({ original, normalised }) =>
        candidateTokens.some(
          (token) =>
            normalised === token ||
            normalised.includes(token) ||
            token.includes(normalised) ||
            original.toLowerCase().includes(token.toLowerCase())
        )
      );

      if (match) {
        mapping[field.key] = match.original;
      }
    });
    setColumnMapping(mapping);
  };

  const handleMappingChange = (targetKey: string, sourceColumn: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [targetKey]: sourceColumn === SKIP_FIELD_VALUE ? "" : sourceColumn,
    }));
    setError(null);
  };

  const validateMapping = () => {
    const missingRequired = targetFields
      .filter((f) => f.required && !columnMapping[f.key])
      .map((f) => f.label);

    if (missingRequired.length > 0) {
      setError(`Missing required fields: ${missingRequired.join(", ")}`);
      return false;
    }
    return true;
  };

  const handleProceedToMapping = () => {
    setStep("mapping");
  };

  const handleProceedToConfirm = () => {
    if (!validateMapping()) return;
    setStep("confirm");
  };

  const handleConfirmImport = async () => {
    if (!validateMapping()) return;

    setIsImporting(true);
    setStep("importing");

    try {
      // Transform raw data using column mapping
      const transformedData = rawData.map((row) => {
        const transformed: any = {};
        Object.entries(columnMapping).forEach(([targetKey, sourceColumn]) => {
          if (sourceColumn && row[sourceColumn] !== undefined) {
            transformed[targetKey] = row[sourceColumn];
          }
        });
        return transformed;
      });

      const result = await onImport(transformedData, {
        fileName: file?.name ?? null,
        sourceColumns,
        columnMapping,
      });

      const successCount =
        result?.successCount ?? result?.count ?? transformedData.length;
      const failureCount =
        result?.failureCount ?? Math.max(0, transformedData.length - successCount);

      setImportResults({
        success: true,
        count: successCount,
        failureCount,
        message: result?.message,
      });

      toast.success(result?.message ?? `Successfully imported ${successCount} records`);

      if (failureCount === 0) {
        setTimeout(() => {
          onOpenChange(false);
          resetDialog();
        }, 2000);
      }
    } catch (err) {
      setError(`Import failed: ${String(err)}`);
      toast.error(`Import failed: ${String(err)}`);
      setIsImporting(false);
      setStep("confirm");
    }
  };

  const resetDialog = () => {
    setStep("upload");
    setFile(null);
    setRawData([]);
    setSourceColumns([]);
    setColumnMapping({});
    setError(null);
    setIsImporting(false);
    setImportResults(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <Label htmlFor="file-input" className="cursor-pointer">
                  <span className="text-sm font-medium">Click to upload or drag and drop</span>
                  <p className="text-xs text-muted-foreground mt-1">CSV or Excel files only</p>
                </Label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">File Preview</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Found {rawData.length} records with {sourceColumns.length} columns
                </p>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {sourceColumns.slice(0, 5).map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-medium">
                            {col}
                          </th>
                        ))}
                        {sourceColumns.length > 5 && (
                          <th className="px-3 py-2 text-left font-medium">
                            +{sourceColumns.length - 5} more
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          {sourceColumns.slice(0, 5).map((col) => (
                            <td key={col} className="px-3 py-2 truncate">
                              {String(row[col] || "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Column Mapping */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Map Columns</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Match your file columns to the headings the system needs. Required fields must be mapped, optional fields can be skipped.
                </p>
                <div className="space-y-3">
                  {targetFields.map((field) => (
                    <div key={field.key} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-sm">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Select
                          value={columnMapping[field.key] || ""}
                          onValueChange={(value) => handleMappingChange(field.key, value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select column..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SKIP_FIELD_VALUE}>-- Skip this field --</SelectItem>
                            {sourceColumns.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Confirm Import</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ready to import {rawData.length} records with the following mapping:
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {Object.entries(columnMapping).map(([target, source]) => (
                    source && (
                      <div key={target} className="flex justify-between text-sm">
                        <span className="font-medium">{target}:</span>
                        <span className="text-muted-foreground">{source}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Importing */}
          {step === "importing" && (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold">Importing...</h3>
                <p className="text-sm text-muted-foreground">Please wait while we import your data</p>
              </div>
            </div>
          )}

          {/* Success */}
          {importResults?.success && (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Import Successful</h3>
                <p className="text-sm text-muted-foreground">
                  {importResults.message ||
                    (importResults.failureCount
                      ? `${importResults.count} records imported. ${importResults.failureCount} row(s) need attention.`
                      : `${importResults.count} records imported successfully`)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleProceedToMapping}>Next: Map Columns</Button>
            </>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                Back
              </Button>
              <Button onClick={handleProceedToConfirm}>Next: Confirm</Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleConfirmImport} disabled={isImporting}>
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </>
          )}
          {step === "importing" && <Button disabled>Importing...</Button>}
          {importResults?.success && <Button onClick={handleClose}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
