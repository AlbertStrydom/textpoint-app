import React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

const DEFAULT_MAX_IMAGE_WIDTH = 480;
const DEFAULT_MAX_IMAGE_HEIGHT = 180;
const DEFAULT_MAX_DATA_URL_LENGTH = 5_000_000;

type FileNormaliseOptions = {
  maxImageWidth?: number;
  maxImageHeight?: number;
  maxDataUrlLength?: number;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = source;
  });
}

async function normaliseFileValue(file: File, options: FileNormaliseOptions = {}) {
  const maxImageWidth = options.maxImageWidth ?? DEFAULT_MAX_IMAGE_WIDTH;
  const maxImageHeight = options.maxImageHeight ?? DEFAULT_MAX_IMAGE_HEIGHT;
  const maxDataUrlLength = options.maxDataUrlLength ?? DEFAULT_MAX_DATA_URL_LENGTH;
  const originalDataUrl = await readFileAsDataUrl(file);

  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    if (originalDataUrl.length > maxDataUrlLength) {
      throw new Error("The selected file is too large. Please choose a smaller document or image.");
    }
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  let scale = Math.min(
    1,
    maxImageWidth / Math.max(image.width, 1),
    maxImageHeight / Math.max(image.height, 1)
  );
  let bestDataUrl = originalDataUrl;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) break;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      const candidate = canvas.toDataURL("image/webp", quality);
      if (candidate.length < bestDataUrl.length) {
        bestDataUrl = candidate;
      }
      if (candidate.length <= maxDataUrlLength) {
        return candidate;
      }
    }

    if (bestDataUrl.length <= maxDataUrlLength) {
      return bestDataUrl;
    }

    scale *= 0.78;
  }

  if (bestDataUrl.length <= maxDataUrlLength) {
    return bestDataUrl;
  }

  throw new Error("The selected image is too large. Please choose a smaller image file.");
}

export interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "time"
    | "datetime-local"
    | "color"
    | "textarea"
    | "select"
    | "file"
    | "checkbox"
    | "checkbox-group"
    | "custom-field-builder";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helpText?: string;
  section?: string;
  disabled?: boolean;
  accept?: string;
  imageMaxWidth?: number;
  imageMaxHeight?: number;
  maxDataUrlLength?: number;
  validation?: (value: unknown) => string | undefined;
}

export type CustomFieldBuilderType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox";

export interface CustomFieldBuilderItem {
  key: string;
  label: string;
  type: CustomFieldBuilderType;
  required?: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  optionsText?: string | null;
}

const CUSTOM_FIELD_TYPE_OPTIONS: Array<{
  value: CustomFieldBuilderType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  initialValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onValuesChange?: (data: Record<string, unknown>) => void;
  normalizeValues?: (
    data: Record<string, unknown>,
    change: { name: string; value: unknown }
  ) => Record<string, unknown>;
  isLoading?: boolean;
  error?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  hideCancelButton?: boolean;
  showCloseButton?: boolean;
  preventDismiss?: boolean;
  renderExtraContent?: (context: {
    values: Record<string, unknown>;
    setValue: (name: string, value: unknown) => void;
    validationErrors: Record<string, string>;
    isLoading: boolean;
    normaliseFile: (
      file: File,
      options?: {
        maxImageWidth?: number;
        maxImageHeight?: number;
        maxDataUrlLength?: number;
      }
    ) => Promise<string>;
  }) => React.ReactNode;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues = {},
  onSubmit,
  onValuesChange,
  normalizeValues,
  isLoading = false,
  error = null,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  hideCancelButton = false,
  showCloseButton = true,
  preventDismiss = false,
  renderExtraContent,
}: FormDialogProps) {
  const [formData, setFormData] = React.useState<Record<string, unknown>>(initialValues);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  const initialValuesKey = React.useMemo(
    () => JSON.stringify(initialValues ?? {}),
    [initialValues]
  );

  React.useEffect(() => {
    if (!open) return;
    setFormData(initialValues ?? {});
    setValidationErrors({});
  }, [open, initialValuesKey]);

  React.useEffect(() => {
    if (open && onValuesChange) {
      onValuesChange(formData);
    }
  }, [formData, open, onValuesChange]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formData[field.name];

      if (
        field.required &&
        (
          value === undefined ||
          value === null ||
          value === "" ||
          value === false ||
          (Array.isArray(value) && value.length === 0)
        )
      ) {
        errors[field.name] = `${field.label} is required`;
      }

      if (field.validation && value !== undefined && value !== null && value !== "") {
        const validationError = field.validation(value);
        if (validationError) {
          errors[field.name] = validationError;
        }
      }

      if (field.type === "email" && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          errors[field.name] = "Invalid email address";
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await onSubmit(formData);
    } catch {
      return;
    }
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => {
      const nextData = {
        ...prev,
        [name]: value,
      };

      return normalizeValues ? normalizeValues(nextData, { name, value }) : nextData;
    });

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const isWideField = (field: FormField) =>
  field.type === "textarea" ||
  field.type === "custom-field-builder" ||
  field.name === "notes" ||
  field.name === "blacklistReason" ||
  field.name === "methodInterested" ||
  field.name === "interestedCourseId" ||
  field.name === "courseId" ||
  field.type === "checkbox" ||
  field.type === "checkbox-group";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0"
        showCloseButton={showCloseButton}
        onEscapeKeyDown={(event) => {
          if (preventDismiss) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (preventDismiss) {
            event.preventDefault();
          }
        }}
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field, index) => {
                  const previousField = index > 0 ? fields[index - 1] : null;
                  const showSection =
                    field.section && field.section !== previousField?.section;
                  const wide = isWideField(field);

                  return (
                    <React.Fragment key={field.name}>
                      {showSection ? (
                        <div className="md:col-span-2 pt-2">
                          <h3 className="text-sm font-semibold text-slate-700 border-b pb-2 mb-0">
                            {field.section}
                          </h3>
                        </div>
                      ) : null}

                      <div className={`space-y-2 min-w-0 ${wide ? "md:col-span-2" : ""}`}>
                        <Label htmlFor={field.name}>
                          {field.label}
                          {field.required ? (
                            <span className="ml-1 text-destructive">*</span>
                          ) : null}
                        </Label>

                        {field.type === "textarea" ? (
                          <Textarea
                            id={field.name}
                            name={field.name}
                            placeholder={field.placeholder}
                            value={String(formData[field.name] ?? "")}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            disabled={isLoading || field.disabled}
                            className={validationErrors[field.name] ? "border-destructive" : ""}
                            rows={4}
                          />
                        ) : field.type === "custom-field-builder" ? (
                          <div className="space-y-3 rounded-md border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm text-muted-foreground">
                                Add extra fields this client wants to capture for this requirement.
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentItems = Array.isArray(formData[field.name])
                                    ? (formData[field.name] as CustomFieldBuilderItem[])
                                    : [];
                                  handleFieldChange(field.name, [
                                    ...currentItems,
                                    {
                                      key: "",
                                      label: "",
                                      type: "text",
                                      required: false,
                                      placeholder: "",
                                      helpText: "",
                                      optionsText: "",
                                    } satisfies CustomFieldBuilderItem,
                                  ]);
                                }}
                                disabled={isLoading || field.disabled}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Field
                              </Button>
                            </div>

                            {(Array.isArray(formData[field.name])
                              ? (formData[field.name] as CustomFieldBuilderItem[])
                              : []
                            ).length === 0 ? (
                              <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                                No custom fields configured yet.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(Array.isArray(formData[field.name])
                                  ? (formData[field.name] as CustomFieldBuilderItem[])
                                  : []
                                ).map((item, index) => {
                                  const updateItem = (
                                    patch: Partial<CustomFieldBuilderItem>
                                  ) => {
                                    const currentItems = Array.isArray(formData[field.name])
                                      ? (formData[field.name] as CustomFieldBuilderItem[])
                                      : [];
                                    handleFieldChange(
                                      field.name,
                                      currentItems.map((currentItem, currentIndex) =>
                                        currentIndex === index
                                          ? { ...currentItem, ...patch }
                                          : currentItem
                                      )
                                    );
                                  };

                                  const removeItem = () => {
                                    const currentItems = Array.isArray(formData[field.name])
                                      ? (formData[field.name] as CustomFieldBuilderItem[])
                                      : [];
                                    handleFieldChange(
                                      field.name,
                                      currentItems.filter((_, currentIndex) => currentIndex !== index)
                                    );
                                  };

                                  return (
                                    <div
                                      key={`${field.name}-${index}`}
                                      className="space-y-3 rounded-md border bg-muted/20 p-3"
                                    >
                                      <div className="grid gap-3 md:grid-cols-3">
                                        <div className="space-y-2">
                                          <Label>Field Label</Label>
                                          <Input
                                            value={item.label ?? ""}
                                            onChange={(e) =>
                                              updateItem({ label: e.target.value })
                                            }
                                            disabled={isLoading || field.disabled}
                                            placeholder="e.g. Certificate Number"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Field Key</Label>
                                          <Input
                                            value={item.key ?? ""}
                                            onChange={(e) =>
                                              updateItem({ key: e.target.value })
                                            }
                                            disabled={isLoading || field.disabled}
                                            placeholder="e.g. certificate_number"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Field Type</Label>
                                          <Select
                                            value={item.type ?? "text"}
                                            onValueChange={(value) =>
                                              updateItem({
                                                type: value as CustomFieldBuilderType,
                                                optionsText:
                                                  value === "select"
                                                    ? item.optionsText ?? ""
                                                    : "",
                                              })
                                            }
                                            disabled={isLoading || field.disabled}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select field type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {CUSTOM_FIELD_TYPE_OPTIONS.map((option) => (
                                                <SelectItem
                                                  key={option.value}
                                                  value={option.value}
                                                >
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      <div className="grid gap-3 md:grid-cols-2">
                                        <div className="space-y-2">
                                          <Label>Placeholder</Label>
                                          <Input
                                            value={item.placeholder ?? ""}
                                            onChange={(e) =>
                                              updateItem({ placeholder: e.target.value })
                                            }
                                            disabled={isLoading || field.disabled}
                                            placeholder="Optional helper placeholder"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Help Text</Label>
                                          <Input
                                            value={item.helpText ?? ""}
                                            onChange={(e) =>
                                              updateItem({ helpText: e.target.value })
                                            }
                                            disabled={isLoading || field.disabled}
                                            placeholder="Optional guidance for the client"
                                          />
                                        </div>
                                      </div>

                                      {item.type === "select" ? (
                                        <div className="space-y-2">
                                          <Label>Dropdown Options</Label>
                                          <Input
                                            value={item.optionsText ?? ""}
                                            onChange={(e) =>
                                              updateItem({ optionsText: e.target.value })
                                            }
                                            disabled={isLoading || field.disabled}
                                            placeholder="Comma separated, e.g. Valid, Pending, Failed"
                                          />
                                        </div>
                                      ) : null}

                                      <div className="flex items-center justify-between gap-3">
                                        <label className="flex items-center gap-2 text-sm">
                                          <Checkbox
                                            checked={Boolean(item.required)}
                                            disabled={isLoading || field.disabled}
                                            onCheckedChange={(checked) =>
                                              updateItem({ required: Boolean(checked) })
                                            }
                                          />
                                          <span>Required field</span>
                                        </label>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive"
                                          onClick={removeItem}
                                          disabled={isLoading || field.disabled}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : field.type === "select" ? (
                          <Select
                            value={String(formData[field.name] ?? "")}
                            onValueChange={(value) => handleFieldChange(field.name, value)}
                            disabled={isLoading || field.disabled}
                          >
                           <SelectTrigger
  id={field.name}
  className={`w-full min-w-0 ${validationErrors[field.name] ? "border-destructive" : ""}`}
> 
                              <SelectValue
  placeholder={field.placeholder || "Select an option"}
  className="truncate"
/>
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "checkbox" ? (
                          <label className="flex items-center gap-3 rounded-md border p-3 text-sm cursor-pointer">
                            <Checkbox
                              checked={Boolean(formData[field.name])}
                              disabled={isLoading || field.disabled}
                              onCheckedChange={(checked) =>
                                handleFieldChange(field.name, Boolean(checked))
                              }
                            />
                            <span>{field.placeholder || field.label}</span>
                          </label>
                        ) : field.type === "checkbox-group" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border p-3">
                            {field.options?.map((option) => {
                              const currentValues = Array.isArray(formData[field.name])
                                ? (formData[field.name] as string[])
                                : [];
                              const checked = currentValues.includes(option.value);

                              return (
                                <label
                                  key={option.value}
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={isLoading || field.disabled}
                                    onCheckedChange={(nextChecked) => {
                                      const nextValues = checked
                                        ? currentValues.filter((value) => value !== option.value)
                                        : [...currentValues, option.value];
                                      handleFieldChange(field.name, nextChecked ? nextValues : nextValues);
                                    }}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : field.type === "file" ? (
                          <Input
                            id={field.name}
                            name={field.name}
                            type="file"
                            accept={field.accept}
                            disabled={isLoading || field.disabled}
                            className={validationErrors[field.name] ? "border-destructive" : ""}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) {
                                handleFieldChange(field.name, "");
                                return;
                              }

                              try {
                                const normalisedValue = await normaliseFileValue(file, {
                                  maxImageWidth: field.imageMaxWidth,
                                  maxImageHeight: field.imageMaxHeight,
                                  maxDataUrlLength: field.maxDataUrlLength,
                                });
                                handleFieldChange(field.name, normalisedValue);
                              } catch (error) {
                                handleFieldChange(field.name, "");
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  [field.name]:
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to read the selected file.",
                                }));
                              }
                            }}
                          />
                        ) : (
                          <Input
                            id={field.name}
                            name={field.name}
                            type={field.type}
                            placeholder={field.placeholder}
                            value={String(formData[field.name] ?? "")}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            disabled={isLoading || field.disabled}
                            className={validationErrors[field.name] ? "border-destructive" : ""}
                          />
                        )}

                        {validationErrors[field.name] ? (
                          <p className="text-sm text-destructive">
                            {validationErrors[field.name]}
                          </p>
                        ) : field.helpText ? (
                          <p className="text-sm text-muted-foreground">
                            {field.helpText}
                          </p>
                        ) : null}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {renderExtraContent ? (
                <div className="mt-6">
                  {renderExtraContent({
                    values: formData,
                    setValue: handleFieldChange,
                    validationErrors,
                    isLoading,
                    normaliseFile: normaliseFileValue,
                  })}
                </div>
              ) : null}
            </div>

            <DialogFooter className="px-6 py-4 border-t">
              {!hideCancelButton ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  {cancelLabel}
                </Button>
              ) : null}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
