import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, type FormField } from "@/components/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Edit2,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Company = {
  id: number;
  name: string;
  registrationNumber: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  physicalAddress: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  status: "Active" | "Inactive" | "Prospect" | string;
  branchId: number | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type Contact = {
  id: number;
  companyId: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  contactType: string;
  notes: string | null;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export default function CompaniesPage() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: companies = [], isLoading: companiesLoading, refetch } =
    trpc.companies.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const {
    data: contacts = [],
    isLoading: contactsLoading,
    refetch: refetchContacts,
  } = trpc.companies.contacts.useQuery(
    { companyId: selectedCompany?.id ?? 0 },
    {
      enabled: Boolean(selectedCompany),
      refetchOnWindowFocus: false,
    }
  );

  const createCompanyMutation = trpc.companies.create.useMutation();
  const updateCompanyMutation = trpc.companies.update.useMutation();
  const deleteCompanyMutation = trpc.companies.delete.useMutation();
  const createContactMutation = trpc.companies.createContact.useMutation();
  const updateContactMutation = trpc.companies.updateContact.useMutation();
  const deleteContactMutation = trpc.companies.deleteContact.useMutation();

  const branchNameById = useMemo(() => {
    return new Map(branches.map((branch) => [branch.id, branch.name]));
  }, [branches]);

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    [branches]
  );

  const companyFields: FormField[] = [
    { name: "name", label: "Company Name", type: "text", required: true },
    { name: "registrationNumber", label: "Registration Number", type: "text" },
    { name: "phone", label: "Company Phone", type: "text" },
    { name: "email", label: "Company Email", type: "email" },
    { name: "website", label: "Website", type: "text" },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "Active", label: "Active" },
        { value: "Prospect", label: "Prospect" },
        { value: "Inactive", label: "Inactive" },
      ],
    },
    {
      name: "branchId",
      label: "Branch",
      type: "select",
      options: branchOptions,
      placeholder: "Select branch",
    },
    {
      name: "physicalAddress",
      label: "Physical Address",
      type: "textarea",
    },
    {
      name: "primaryContactName",
      label: "Primary Contact Name",
      type: "text",
    },
    {
      name: "primaryContactEmail",
      label: "Primary Contact Email",
      type: "email",
    },
    {
      name: "primaryContactPhone",
      label: "Primary Contact Phone",
      type: "text",
    },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const contactFields: FormField[] = [
    { name: "firstName", label: "First Name", type: "text", required: true },
    { name: "lastName", label: "Last Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "position", label: "Position / Role", type: "text" },
    {
      name: "contactType",
      label: "Contact Type",
      type: "select",
      required: true,
      options: [
        { value: "Client", label: "Client" },
        { value: "Accounts", label: "Accounts" },
        { value: "Technical", label: "Technical" },
        { value: "Training", label: "Training" },
        { value: "Other", label: "Other" },
      ],
    },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const companyInitialValues = editingCompany
    ? {
        name: editingCompany.name,
        registrationNumber: editingCompany.registrationNumber ?? "",
        phone: editingCompany.phone ?? "",
        email: editingCompany.email ?? "",
        website: editingCompany.website ?? "",
        status: editingCompany.status ?? "Active",
        branchId: editingCompany.branchId ? String(editingCompany.branchId) : "",
        physicalAddress: editingCompany.physicalAddress ?? "",
        primaryContactName: editingCompany.primaryContactName ?? "",
        primaryContactEmail: editingCompany.primaryContactEmail ?? "",
        primaryContactPhone: editingCompany.primaryContactPhone ?? "",
        notes: editingCompany.notes ?? "",
      }
    : {
        name: "",
        registrationNumber: "",
        phone: "",
        email: "",
        website: "",
        status: "Active",
        branchId: "",
        physicalAddress: "",
        primaryContactName: "",
        primaryContactEmail: "",
        primaryContactPhone: "",
        notes: "",
      };

  const contactInitialValues = editingContact
    ? {
        firstName: editingContact.firstName,
        lastName: editingContact.lastName,
        email: editingContact.email ?? "",
        phone: editingContact.phone ?? "",
        position: editingContact.position ?? "",
        contactType: editingContact.contactType ?? "Client",
        notes: editingContact.notes ?? "",
      }
    : {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        position: "",
        contactType: "Client",
        notes: "",
      };

  const companyColumns: Column<Company>[] = [
    { key: "name", label: "Company", sortable: true, filterable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={value === "Active" ? "default" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "branchId",
      label: "Branch",
      sortable: true,
      render: (value) =>
        typeof value === "number" ? branchNameById.get(value) ?? "-" : "-",
    },
    { key: "primaryContactName", label: "Primary Contact", render: (value) => value || "-" },
    { key: "email", label: "Email", render: (value) => value || "-" },
    { key: "phone", label: "Phone", render: (value) => value || "-" },
  ];

  const contactColumns: Column<Contact>[] = [
    {
      key: "firstName",
      label: "Name",
      sortable: true,
      render: (_value, row) => `${row.firstName} ${row.lastName}`,
    },
    { key: "position", label: "Position", render: (value) => value || "-" },
    { key: "contactType", label: "Type", sortable: true },
    { key: "email", label: "Email", render: (value) => value || "-" },
    { key: "phone", label: "Phone", render: (value) => value || "-" },
  ];

  const handleCompanySubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: String(values.name ?? "").trim(),
        registrationNumber: cleanOptionalString(values.registrationNumber),
        phone: cleanOptionalString(values.phone),
        email: cleanOptionalString(values.email),
        website: cleanOptionalString(values.website),
        physicalAddress: cleanOptionalString(values.physicalAddress),
        primaryContactName: cleanOptionalString(values.primaryContactName),
        primaryContactEmail: cleanOptionalString(values.primaryContactEmail),
        primaryContactPhone: cleanOptionalString(values.primaryContactPhone),
        status: (values.status as "Active" | "Inactive" | "Prospect") || "Active",
        branchId: values.branchId ? Number(values.branchId) : undefined,
        notes: cleanOptionalString(values.notes),
      };

      if (editingCompany) {
        await updateCompanyMutation.mutateAsync({
          id: editingCompany.id,
          data: payload,
        });
        toast.success("Company updated.");
      } else {
        await createCompanyMutation.mutateAsync(payload);
        toast.success("Company created.");
      }

      await refetch();
      await utils.companies.list.invalidate();
      setIsCompanyFormOpen(false);
      setEditingCompany(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save company.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = async (values: Record<string, unknown>) => {
    if (!selectedCompany) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        companyId: selectedCompany.id,
        firstName: String(values.firstName ?? "").trim(),
        lastName: String(values.lastName ?? "").trim(),
        email: cleanOptionalString(values.email),
        phone: cleanOptionalString(values.phone),
        position: cleanOptionalString(values.position),
        contactType: cleanOptionalString(values.contactType) || "Client",
        notes: cleanOptionalString(values.notes),
      };

      if (editingContact) {
        await updateContactMutation.mutateAsync({
          id: editingContact.id,
          data: payload,
        });
        toast.success("Contact updated.");
      } else {
        await createContactMutation.mutateAsync(payload);
        toast.success("Contact added.");
      }

      await refetchContacts();
      setIsContactFormOpen(false);
      setEditingContact(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save contact.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Delete company ${company.name}? This will also delete its linked contacts.`)) {
      return;
    }

    try {
      await deleteCompanyMutation.mutateAsync({ id: company.id });
      toast.success("Company deleted.");
      if (selectedCompany?.id === company.id) {
        setSelectedCompany(null);
      }
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete company.");
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm(`Delete contact ${contact.firstName} ${contact.lastName}?`)) {
      return;
    }

    try {
      await deleteContactMutation.mutateAsync({ id: contact.id });
      toast.success("Contact deleted.");
      await refetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-6 w-6" />
              Company Directory
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage CRM companies and their contact people.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingCompany(null);
              setError(null);
              setIsCompanyFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Total Companies</p>
            <p className="mt-2 text-3xl font-bold">{companies.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="mt-2 text-3xl font-bold">
              {(companies as Company[]).filter((company) => company.status === "Active").length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Prospects</p>
            <p className="mt-2 text-3xl font-bold">
              {(companies as Company[]).filter((company) => company.status === "Prospect").length}
            </p>
          </div>
        </div>

        <DataTable
          columns={companyColumns}
          data={companies as Company[]}
          isLoading={companiesLoading}
          pageSize={10}
          searchPlaceholder="Search companies..."
          onRowClick={(company) => setSelectedCompany(company)}
          actions={(company) => (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedCompany(company);
                }}
              >
                <UserRound className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingCompany(company);
                  setError(null);
                  setIsCompanyFormOpen(true);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteCompany(company);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        />

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold">
                {selectedCompany ? selectedCompany.name : "Company Contacts"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedCompany
                  ? "Manage people linked to this company."
                  : "Select a company to view and manage its contacts."}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={!selectedCompany}
              onClick={() => {
                setEditingContact(null);
                setError(null);
                setIsContactFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>

          {selectedCompany ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p>{selectedCompany.email || "-"}</p>
                </div>
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  <p>{selectedCompany.phone || "-"}</p>
                </div>
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <div className="mb-1 text-muted-foreground">Primary Contact</div>
                  <p>{selectedCompany.primaryContactName || "-"}</p>
                </div>
              </div>

              <DataTable
                columns={contactColumns}
                data={contacts as Contact[]}
                isLoading={contactsLoading}
                pageSize={5}
                searchPlaceholder="Search contacts..."
                actions={(contact) => (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingContact(contact);
                        setError(null);
                        setIsContactFormOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteContact(contact);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              />
            </div>
          ) : null}
        </div>

        <FormDialog
          open={isCompanyFormOpen}
          onOpenChange={(open) => {
            setIsCompanyFormOpen(open);
            if (!open) {
              setEditingCompany(null);
              setError(null);
            }
          }}
          title={editingCompany ? "Edit Company" : "Add Company"}
          description="Capture company details, branch ownership, and primary contact information."
          fields={companyFields}
          initialValues={companyInitialValues}
          onSubmit={handleCompanySubmit}
          isLoading={isSubmitting}
          error={error}
          submitLabel={editingCompany ? "Update" : "Create"}
        />

        <FormDialog
          open={isContactFormOpen}
          onOpenChange={(open) => {
            setIsContactFormOpen(open);
            if (!open) {
              setEditingContact(null);
              setError(null);
            }
          }}
          title={editingContact ? "Edit Contact" : "Add Contact"}
          description={
            selectedCompany
              ? `Contact for ${selectedCompany.name}.`
              : "Contact for selected company."
          }
          fields={contactFields}
          initialValues={contactInitialValues}
          onSubmit={handleContactSubmit}
          isLoading={isSubmitting}
          error={error}
          submitLabel={editingContact ? "Update" : "Create"}
        />
      </div>
    </DashboardLayout>
  );
}
