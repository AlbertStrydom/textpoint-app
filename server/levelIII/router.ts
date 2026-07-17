import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { summarizeLevelIIITechnicianCertificateMethodLevels } from "@shared/levelIIICertificateWorkflow";
import { getEntityAuditTrail, logAuditEvent } from "../audit";
import {
  getAllLevelIIIClients,
  createLevelIIIClient,
  updateLevelIIIClient,
  deleteLevelIIIClient,
  getAllLevelIIIActivities,
  createLevelIIIActivity,
  updateLevelIIIActivity,
  deleteLevelIIIActivity,
  getAllPortalClientBranches,
  getAllLevelIIITechnicians,
  createLevelIIITechnician,
  updateLevelIIITechnician,
  deleteLevelIIITechnician,
  bootstrapLevelIIITechnicianComplianceFromDriveAudit,
  bootstrapLevelIIITechnicianCertificatesFromDriveAudit,
  getAllLevelIIITechnicianCertificates,
  getAllLevelIIITechnicianCertificateExports,
  getLevelIIITechnicianCertificateExportHistory,
  recordLevelIIITechnicianCertificateExport,
  createLevelIIITechnicianCertificate,
  updateLevelIIITechnicianCertificate,
  updateLevelIIITechnicianCertificateApproval,
  deleteLevelIIITechnicianCertificate,
  getAllLevelIIIAssessments,
  createLevelIIIAssessment,
  updateLevelIIIAssessment,
  deleteLevelIIIAssessment,
  getAllLevelIIIEquipment,
  createLevelIIIEquipment,
  updateLevelIIIEquipment,
  deleteLevelIIIEquipment,
  getAllLevelIIISpecimens,
  createLevelIIISpecimen,
  updateLevelIIISpecimen,
  deleteLevelIIISpecimen,
} from "../db";

const levelIIITechnicianMethodQualificationSchema = z.object({
  method: z.string().min(1),
  level: z.string().min(1),
});

function buildLevelIIITechnicianAuditSnapshot(
  technician: {
    id?: number;
    name?: string | null;
    clientId?: number | null;
    clientBranchId?: number | null;
    methods?: string[] | null;
    level?: string | null;
    hasPcnQualification?: boolean | null;
  },
  clientMap: Map<number, string>,
  branchMap: Map<number, { name: string; clientId: number }>
) {
  const clientId = typeof technician.clientId === "number" ? technician.clientId : null;
  const clientBranchId =
    typeof technician.clientBranchId === "number" ? technician.clientBranchId : null;
  const branch = clientBranchId ? branchMap.get(clientBranchId) ?? null : null;

  return {
    technicianName: technician.name ?? null,
    clientId,
    companyName: clientId ? clientMap.get(clientId) ?? null : null,
    clientBranchId,
    branchName: branch?.name ?? null,
    methods: Array.isArray(technician.methods) ? technician.methods : [],
    level: technician.level ?? null,
    qualificationType: technician.hasPcnQualification ? "PCN" : "SNT-TC-1A",
  };
}

function buildLevelIIITechnicianUpdateAuditChanges(
  previous: {
    id?: number;
    name?: string | null;
    clientId?: number | null;
    clientBranchId?: number | null;
    methods?: string[] | null;
    level?: string | null;
    hasPcnQualification?: boolean | null;
  },
  next: {
    id?: number;
    name?: string | null;
    clientId?: number | null;
    clientBranchId?: number | null;
    methods?: string[] | null;
    level?: string | null;
    hasPcnQualification?: boolean | null;
  },
  clientMap: Map<number, string>,
  branchMap: Map<number, { name: string; clientId: number }>
) {
  const previousSnapshot = buildLevelIIITechnicianAuditSnapshot(previous, clientMap, branchMap);
  const nextSnapshot = buildLevelIIITechnicianAuditSnapshot(next, clientMap, branchMap);
  const changes: Record<string, unknown> = {
    beforeCompany: previousSnapshot.companyName,
    afterCompany: nextSnapshot.companyName,
    beforeBranch: previousSnapshot.branchName,
    afterBranch: nextSnapshot.branchName,
    beforeMethods: previousSnapshot.methods.join(", "),
    afterMethods: nextSnapshot.methods.join(", "),
    beforeLevel: previousSnapshot.level,
    afterLevel: nextSnapshot.level,
  };

  if (previousSnapshot.clientId !== nextSnapshot.clientId) {
    changes.transferType = "company_transfer";
    changes.transferSummary = `${previousSnapshot.companyName ?? "Unassigned"} -> ${nextSnapshot.companyName ?? "Unassigned"}`;
  } else if (previousSnapshot.clientBranchId !== nextSnapshot.clientBranchId) {
    changes.transferType = "branch_transfer";
    changes.transferSummary = `${previousSnapshot.branchName ?? "Unassigned"} -> ${nextSnapshot.branchName ?? "Unassigned"}`;
  } else {
    changes.transferType = "details_update";
  }

  return changes;
}

function buildLevelIIITechnicianCertificateAuditSnapshot(certificate: {
  technicianId?: number | null;
  assessmentId?: number | null;
  certificateNumber?: string | null;
  method?: string | null;
  level?: string | null;
  methodLevels?: Array<{ method: string; level: string }> | null;
  issuedDate?: string | Date | null;
  validUntil?: string | Date | null;
  validityValue?: number | null;
  validityUnit?: string | null;
  status?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
}) {
  return {
    technicianId: certificate.technicianId ?? null,
    assessmentId: certificate.assessmentId ?? null,
    certificateNumber: certificate.certificateNumber ?? null,
    methods:
      Array.isArray(certificate.methodLevels) && certificate.methodLevels.length > 0
        ? summarizeLevelIIITechnicianCertificateMethodLevels(certificate.methodLevels)
        : [certificate.method, certificate.level].filter(Boolean).join(" ").trim() || null,
    issuedDate:
      certificate.issuedDate instanceof Date
        ? certificate.issuedDate.toISOString().slice(0, 10)
        : certificate.issuedDate ?? null,
    validUntil:
      certificate.validUntil instanceof Date
        ? certificate.validUntil.toISOString().slice(0, 10)
        : certificate.validUntil ?? null,
    validityValue: certificate.validityValue ?? null,
    validityUnit: certificate.validityUnit ?? null,
    status: certificate.status ?? null,
    fileName: certificate.fileName ?? null,
    hasFileLink: Boolean(certificate.fileUrl),
  };
}

function buildLevelIIITechnicianCertificateUpdateAuditChanges(
  previous: Parameters<typeof buildLevelIIITechnicianCertificateAuditSnapshot>[0],
  next: Parameters<typeof buildLevelIIITechnicianCertificateAuditSnapshot>[0]
) {
  const before = buildLevelIIITechnicianCertificateAuditSnapshot(previous);
  const after = buildLevelIIITechnicianCertificateAuditSnapshot(next);
  return {
    beforeCertificateNumber: before.certificateNumber,
    afterCertificateNumber: after.certificateNumber,
    beforeMethods: before.methods,
    afterMethods: after.methods,
    beforeValidUntil: before.validUntil,
    afterValidUntil: after.validUntil,
    beforeStatus: before.status,
    afterStatus: after.status,
    beforeFileName: before.fileName,
    afterFileName: after.fileName,
  };
}

function getAutoSupersededLevelIIITechnicianCertificates(
  certificate: unknown
): Array<{
  id: number;
  technicianId: number;
  certificateNumber: string | null;
  status: string | null;
  notes?: string | null;
}> {
  const source = (certificate as { autoSupersededCertificates?: unknown })?.autoSupersededCertificates;
  if (!Array.isArray(source)) {
    return [];
  }
  return source
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Record<string, unknown>;
      const id = Number(candidate.id ?? 0);
      const technicianId = Number(candidate.technicianId ?? 0);
      if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(technicianId) || technicianId <= 0) {
        return null;
      }
      return {
        id,
        technicianId,
        certificateNumber:
          typeof candidate.certificateNumber === "string" ? candidate.certificateNumber : null,
        status: typeof candidate.status === "string" ? candidate.status : null,
        notes: typeof candidate.notes === "string" ? candidate.notes : null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

function getAuditRequestMeta(ctx: {
  req: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  };
}) {
  const rawUserAgent = ctx.req.headers["user-agent"];
  return {
    ipAddress: ctx.req.ip,
    userAgent: Array.isArray(rawUserAgent) ? rawUserAgent.join(", ") : rawUserAgent,
  };
}

const levelIIIRouter = router({
  clients: router({
    list: protectedProcedure
      .input(
        z
          .object({
            includeLinkedBranchClients: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return getAllLevelIIIClients({
          includeLinkedBranchClients: input?.includeLinkedBranchClients ?? false,
        });
      }),

    create: protectedProcedure
      .input(
        z.object({
          companyName: z.string().min(1),
          primaryContact: z.string().min(1),
          secondaryContact: z.string().optional().nullable(),
          email: z.string().email(),
          secondaryEmail: z.string().email().optional().or(z.literal("")).nullable(),
          phone: z.string().min(1),
          secondaryPhone: z.string().optional().nullable(),
          physicalAddress: z.string().min(1),
          visitCadence: z.enum(["Weekly", "Monthly", "Six Monthly"]),
          lastVisit: z.date().optional().nullable(),
          nextVisit: z.date().optional().nullable(),
          procedureUpdatedAt: z.date().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        return createLevelIIIClient({
          ...input,
          secondaryContact: input.secondaryContact?.trim() || null,
          secondaryEmail: input.secondaryEmail?.trim() || null,
          secondaryPhone: input.secondaryPhone?.trim() || null,
          notes: input.notes?.trim() || null,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            companyName: z.string().min(1).optional(),
            primaryContact: z.string().min(1).optional(),
            secondaryContact: z.string().optional().nullable(),
            email: z.string().email().optional(),
            secondaryEmail: z.string().email().optional().or(z.literal("")).nullable(),
            phone: z.string().min(1).optional(),
            secondaryPhone: z.string().optional().nullable(),
            physicalAddress: z.string().min(1).optional(),
            visitCadence: z.enum(["Weekly", "Monthly", "Six Monthly"]).optional(),
            lastVisit: z.date().optional().nullable(),
            nextVisit: z.date().optional().nullable(),
            procedureUpdatedAt: z.date().optional().nullable(),
            notes: z.string().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return updateLevelIIIClient(input.id, {
          ...input.data,
          secondaryContact:
            input.data.secondaryContact === undefined
              ? undefined
              : input.data.secondaryContact?.trim() || null,
          secondaryEmail:
            input.data.secondaryEmail === undefined
              ? undefined
              : input.data.secondaryEmail?.trim() || null,
          secondaryPhone:
            input.data.secondaryPhone === undefined
              ? undefined
              : input.data.secondaryPhone?.trim() || null,
          notes:
            input.data.notes === undefined
              ? undefined
              : input.data.notes?.trim() || null,
        } as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLevelIIIClient(input.id);
        return { success: true };
      }),
  }),

  activities: router({
    list: protectedProcedure.query(async () => {
      return getAllLevelIIIActivities();
    }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          activityType: z.enum([
            "Visit",
            "Call",
            "Email",
            "Assessment",
            "Procedure Review",
            "General",
          ]),
          subject: z.string().min(1),
          activityDate: z.date(),
          nextActionDate: z.date().optional().nullable(),
          status: z.enum(["Planned", "Completed", "Cancelled"]).optional(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        return createLevelIIIActivity({
          ...input,
          notes: input.notes?.trim() || null,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            clientId: z.number().optional(),
            activityType: z
              .enum([
                "Visit",
                "Call",
                "Email",
                "Assessment",
                "Procedure Review",
                "General",
              ])
              .optional(),
            subject: z.string().min(1).optional(),
            activityDate: z.date().optional(),
            nextActionDate: z.date().optional().nullable(),
            status: z.enum(["Planned", "Completed", "Cancelled"]).optional(),
            notes: z.string().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return updateLevelIIIActivity(input.id, {
          ...input.data,
          notes:
            input.data.notes === undefined
              ? undefined
              : input.data.notes?.trim() || null,
        } as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteLevelIIIActivity(input.id);
      }),
  }),

  clientBranches: router({
    list: protectedProcedure.query(async () => {
      return getAllPortalClientBranches();
    }),
  }),

  technicians: router({
    list: protectedProcedure.query(async () => {
      return getAllLevelIIITechnicians();
    }),

    history: protectedProcedure
      .input(z.object({ id: z.number(), limit: z.number().int().min(1).max(100).default(20) }))
      .query(async ({ input }) => {
        return getEntityAuditTrail("levelIII_technician", input.id, input.limit);
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          clientBranchId: z.number().optional().nullable(),
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional().nullable(),
          methods: z.array(z.string().min(1)).min(1),
          level: z.string().min(1),
          methodQualifications: z
            .array(levelIIITechnicianMethodQualificationSchema)
            .min(1),
          hasPcnQualification: z.boolean().optional(),
          certificateNumber: z.string().optional().nullable(),
          procedureStatus: z.string().optional().nullable(),
          pcnRenewalDate: z.date().optional().nullable(),
          internalAssessmentDate: z.date().optional().nullable(),
          eyeTestValidUntil: z.date().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createLevelIIITechnician({
          ...input,
          method: input.methods.join(", "),
          phone: input.phone?.trim() || null,
          certificateNumber: input.certificateNumber?.trim() || null,
          procedureStatus: input.procedureStatus?.trim() || null,
          notes: input.notes?.trim() || null,
        } as any);
        const [clients, branches] = await Promise.all([
          getAllLevelIIIClients({ includeLinkedBranchClients: true }),
          getAllPortalClientBranches(),
        ]);
        const clientMap = new Map(clients.map((client) => [client.id, client.companyName] as const));
        const branchMap = new Map(
          branches.map((branch) => [branch.id, { name: branch.name, clientId: branch.clientId }] as const)
        );
        const insertId =
          typeof result === "object" && result && "insertId" in result
            ? Number((result as { insertId?: unknown }).insertId ?? 0)
            : 0;
        await logAuditEvent(
          ctx.user.id,
          "CREATE",
          "levelIII_technician",
          insertId || input.clientId,
          buildLevelIIITechnicianAuditSnapshot(
            {
              id: insertId || undefined,
              name: input.name,
              clientId: input.clientId,
              clientBranchId: input.clientBranchId ?? null,
              methods: input.methods,
              level: input.level,
              hasPcnQualification: input.hasPcnQualification ?? false,
            },
            clientMap,
            branchMap
          ),
          getAuditRequestMeta(ctx).ipAddress,
          getAuditRequestMeta(ctx).userAgent
        );
        return result;
      }),

    importDriveAudit: protectedProcedure
      .input(
        z.object({
          existingTechnicianId: z.number().optional().nullable(),
          clientId: z.number(),
          clientBranchId: z.number().optional().nullable(),
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional().nullable(),
          methods: z.array(z.string().min(1)).min(1),
          level: z.string().min(1),
          methodQualifications: z
            .array(levelIIITechnicianMethodQualificationSchema)
            .min(1),
          hasPcnQualification: z.boolean().optional(),
          certificateNumber: z.string().optional().nullable(),
          procedureStatus: z.string().optional().nullable(),
          pcnRenewalDate: z.date().optional().nullable(),
          internalAssessmentDate: z.date().optional().nullable(),
          eyeTestValidUntil: z.date().optional().nullable(),
          notes: z.string().optional().nullable(),
          importAudit: z
            .object({
              sourceFolder: z.string().optional().nullable(),
              folderGroup: z.string().optional().nullable(),
              fileCount: z.number().int().optional().nullable(),
              documentSummary: z.string().optional().nullable(),
              missingCoreDocuments: z.array(z.string().min(1)).optional(),
              detectedDocuments: z.array(z.string().min(1)).optional(),
            })
            .optional()
            .nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const payload = {
          clientId: input.clientId,
          clientBranchId: input.clientBranchId ?? null,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone?.trim() || null,
          methods: input.methods.map((method) => method.trim()),
          method: input.methods.join(", "),
          level: input.level.trim(),
          methodQualifications: input.methodQualifications.map((entry) => ({
            method: entry.method.trim(),
            level: entry.level.trim(),
          })),
          hasPcnQualification: input.hasPcnQualification ?? false,
          certificateNumber: input.certificateNumber?.trim() || null,
          procedureStatus: input.procedureStatus?.trim() || null,
          pcnRenewalDate: input.pcnRenewalDate ?? null,
          internalAssessmentDate: input.internalAssessmentDate ?? null,
          eyeTestValidUntil: input.eyeTestValidUntil ?? null,
          notes: input.notes?.trim() || null,
        };

        let technicianId = Number(input.existingTechnicianId ?? 0);
        let action: "created" | "updated" = "updated";

        if (technicianId > 0) {
          await updateLevelIIITechnician(technicianId, payload as any);
        } else {
          const created = await createLevelIIITechnician(payload as any);
          technicianId =
            typeof created === "object" && created && "insertId" in created
              ? Number((created as { insertId?: unknown }).insertId ?? 0)
              : 0;
          action = "created";
        }

        if (!technicianId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The technician import could not determine the saved record ID.",
          });
        }

        const complianceSeed =
          input.importAudit
            ? await bootstrapLevelIIITechnicianComplianceFromDriveAudit({
                technicianId,
                sourceFolder: input.importAudit.sourceFolder?.trim() || null,
                folderGroup: input.importAudit.folderGroup?.trim() || null,
                fileCount: input.importAudit.fileCount ?? null,
                documentSummary: input.importAudit.documentSummary?.trim() || null,
                missingCoreDocuments: input.importAudit.missingCoreDocuments ?? [],
                detectedDocuments: input.importAudit.detectedDocuments ?? [],
                internalAssessmentDate: input.internalAssessmentDate ?? null,
                eyeTestValidUntil: input.eyeTestValidUntil ?? null,
                uploadedByUserId: ctx.user.id,
              })
            : null;
        const certificateSeed =
          input.importAudit
            ? await bootstrapLevelIIITechnicianCertificatesFromDriveAudit({
                technicianId,
                sourceFolder: input.importAudit.sourceFolder?.trim() || null,
                detectedDocuments: input.importAudit.detectedDocuments ?? [],
                internalAssessmentDate: input.internalAssessmentDate ?? null,
                uploadedByUserId: ctx.user.id,
                notes: input.importAudit.documentSummary?.trim() || null,
              })
            : null;

        await logAuditEvent(
          ctx.user.id,
          action === "created" ? "CREATE" : "UPDATE",
          "levelIII_technician",
          technicianId,
          {
            importedFromDriveAudit: true,
            technicianName: payload.name,
            clientId: payload.clientId,
            clientBranchId: payload.clientBranchId,
            methods: payload.methods,
            complianceSeed,
            certificateSeed,
          },
          getAuditRequestMeta(ctx).ipAddress,
          getAuditRequestMeta(ctx).userAgent
        );

        return {
          technicianId,
          action,
          complianceSeed,
          certificateSeed,
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            clientId: z.number().optional(),
            clientBranchId: z.number().optional().nullable(),
            name: z.string().min(1).optional(),
            email: z.string().email().optional(),
            phone: z.string().optional().nullable(),
            methods: z.array(z.string().min(1)).min(1).optional(),
            level: z.string().min(1).optional(),
            methodQualifications: z
              .array(levelIIITechnicianMethodQualificationSchema)
              .min(1)
              .optional(),
            hasPcnQualification: z.boolean().optional(),
            certificateNumber: z.string().optional().nullable(),
            procedureStatus: z.string().optional().nullable(),
            pcnRenewalDate: z.date().optional().nullable(),
            internalAssessmentDate: z.date().optional().nullable(),
            eyeTestValidUntil: z.date().optional().nullable(),
            notes: z.string().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const technicians = await getAllLevelIIITechnicians();
        const existingTechnician = technicians.find((technician) => technician.id === input.id);
        const result = await updateLevelIIITechnician(input.id, {
          ...input.data,
          method:
            input.data.methods === undefined
              ? undefined
              : input.data.methods.join(", "),
          phone:
            input.data.phone === undefined
              ? undefined
              : input.data.phone?.trim() || null,
          certificateNumber:
            input.data.certificateNumber === undefined
              ? undefined
              : input.data.certificateNumber?.trim() || null,
          procedureStatus:
            input.data.procedureStatus === undefined
              ? undefined
              : input.data.procedureStatus?.trim() || null,
          notes:
            input.data.notes === undefined
              ? undefined
              : input.data.notes?.trim() || null,
        } as any);
        const [clients, branches, refreshedTechnicians] = await Promise.all([
          getAllLevelIIIClients({ includeLinkedBranchClients: true }),
          getAllPortalClientBranches(),
          getAllLevelIIITechnicians(),
        ]);
        const updatedTechnician =
          refreshedTechnicians.find((technician) => technician.id === input.id) ?? null;
        if (existingTechnician && updatedTechnician) {
          const clientMap = new Map(
            clients.map((client) => [client.id, client.companyName] as const)
          );
          const branchMap = new Map(
            branches.map(
              (branch) => [branch.id, { name: branch.name, clientId: branch.clientId }] as const
            )
          );
          await logAuditEvent(
            ctx.user.id,
            "UPDATE",
            "levelIII_technician",
            input.id,
            buildLevelIIITechnicianUpdateAuditChanges(
              existingTechnician,
              updatedTechnician,
              clientMap,
              branchMap
            ),
            getAuditRequestMeta(ctx).ipAddress,
            getAuditRequestMeta(ctx).userAgent
          );
        }
        return result;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const technicians = await getAllLevelIIITechnicians();
        const existingTechnician = technicians.find((technician) => technician.id === input.id) ?? null;
        await deleteLevelIIITechnician(input.id);
        if (existingTechnician) {
          const [clients, branches] = await Promise.all([
            getAllLevelIIIClients({ includeLinkedBranchClients: true }),
            getAllPortalClientBranches(),
          ]);
          const clientMap = new Map(
            clients.map((client) => [client.id, client.companyName] as const)
          );
          const branchMap = new Map(
            branches.map(
              (branch) => [branch.id, { name: branch.name, clientId: branch.clientId }] as const
            )
          );
          await logAuditEvent(
            ctx.user.id,
            "DELETE",
            "levelIII_technician",
            input.id,
            buildLevelIIITechnicianAuditSnapshot(existingTechnician, clientMap, branchMap),
            getAuditRequestMeta(ctx).ipAddress,
            getAuditRequestMeta(ctx).userAgent
          );
        }
        return { success: true };
      }),
  }),

  technicianCertificates: router({
    list: protectedProcedure.query(async () => {
      return getAllLevelIIITechnicianCertificates();
    }),

    history: protectedProcedure
      .input(z.object({ id: z.number(), limit: z.number().int().min(1).max(50).optional() }))
      .query(async ({ input }) => {
        return getLevelIIITechnicianCertificateExportHistory(input.id, input.limit ?? 20);
      }),

    exports: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(1000).optional() }).optional())
      .query(async ({ input }) => {
        return getAllLevelIIITechnicianCertificateExports(input?.limit ?? 500);
      }),

    auditTrail: protectedProcedure
      .input(z.object({ id: z.number(), limit: z.number().int().min(1).max(50).optional() }))
      .query(async ({ input }) => {
        return getEntityAuditTrail("levelIII_technician_certificate", input.id, input.limit ?? 20);
      }),

    signOff: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          action: z.enum(["submit", "approve", "reject", "reopen"]),
          note: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [allCertificates, allTechnicians] = await Promise.all([
          getAllLevelIIITechnicianCertificates(),
          getAllLevelIIITechnicians(),
        ]);
        const existingCertificate =
          allCertificates.find((certificate) => certificate.id === input.id) ?? null;
        if (!existingCertificate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Level III certificate not found.",
          });
        }
        const certificateTechnician =
          allTechnicians.find((technician) => technician.id === existingCertificate.technicianId) ?? null;

        const note = input.note?.trim() || null;
        if ((input.action === "approve" || input.action === "reject") && !note) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A reviewer note is required when approving or rejecting a certificate.",
          });
        }

        const now = new Date();
        let updated;
        switch (input.action) {
          case "submit":
            updated = await updateLevelIIITechnicianCertificateApproval({
              id: input.id,
              approvalStatus: "in_review",
              approvalRequestedAt: now,
              approvalRequestedBy: ctx.user.id,
              approvedAt: null,
              approvedBy: null,
              approvalNote: note,
            });
            break;
          case "approve":
            updated = await updateLevelIIITechnicianCertificateApproval({
              id: input.id,
              approvalStatus: "approved",
              approvedAt: now,
              approvedBy: ctx.user.id,
              approvalNote: note,
            });
            break;
          case "reject":
            updated = await updateLevelIIITechnicianCertificateApproval({
              id: input.id,
              approvalStatus: "rejected",
              approvedAt: null,
              approvedBy: null,
              approvalNote: note,
            });
            break;
          case "reopen":
          default:
            updated = await updateLevelIIITechnicianCertificateApproval({
              id: input.id,
              approvalStatus: "draft",
              approvalRequestedAt: null,
              approvalRequestedBy: null,
              approvedAt: null,
              approvedBy: null,
              approvalNote: note,
            });
            break;
        }

        if (updated) {
          await logAuditEvent(
            ctx.user.id,
            "UPDATE",
            "levelIII_technician_certificate",
            input.id,
            {
              action: input.action,
              approvalStatus: (updated as any).approvalStatus ?? null,
              approvalNote: note,
            },
            getAuditRequestMeta(ctx).ipAddress,
            getAuditRequestMeta(ctx).userAgent
          );

          const { notifyLevelIIITechnicianCertificateSignOffChanged } = await import(
            "../notifications"
          );

          await notifyLevelIIITechnicianCertificateSignOffChanged({
            certificateId: input.id,
            certificateNumber: String((updated as any).certificateNumber ?? existingCertificate.certificateNumber ?? ""),
            technicianName: certificateTechnician?.name?.trim() || null,
            action: input.action,
            actorUserId: ctx.user.id,
            actorName: ctx.user.name ?? ctx.user.email ?? null,
            note,
            approvalRequestedBy: Number(
              (updated as any).approvalRequestedBy ?? existingCertificate.approvalRequestedBy ?? 0
            ),
            approvedBy: Number((updated as any).approvedBy ?? existingCertificate.approvedBy ?? 0),
            issuedBy: Number((updated as any).issuedBy ?? existingCertificate.issuedBy ?? 0),
          });
        }
        return updated;
      }),

    create: protectedProcedure
      .input(
        z.object({
          technicianId: z.number(),
          assessmentId: z.number().optional().nullable(),
          certificateNumber: z.string().optional().nullable(),
          method: z.string().min(1).optional(),
          level: z.string().min(1).optional(),
          methodLevels: z
            .array(
              z.object({
                method: z.string().min(1),
                level: z.string().min(1),
              })
            )
            .min(1)
            .optional(),
          issuedDate: z.date().optional(),
          validUntil: z.date().optional().nullable(),
          validityValue: z.number().int().positive().optional().nullable(),
          validityUnit: z.enum(["days", "months", "years", "custom"]).optional().nullable(),
          status: z.enum(["Active", "Expired", "Revoked", "Superseded"]).optional(),
          fileName: z.string().optional().nullable(),
          fileUrl: z.string().url().optional().or(z.literal("")).nullable(),
          fileKey: z.string().optional().nullable(),
          contentType: z.string().optional().nullable(),
          attachmentFileDataUrl: z.string().optional().nullable(),
          attachmentFileName: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const created = await createLevelIIITechnicianCertificate({
          ...input,
          certificateNumber: input.certificateNumber?.trim() || null,
          fileName: input.fileName?.trim() || null,
          fileUrl: input.fileUrl?.trim() || null,
          fileKey: input.fileKey?.trim() || null,
          contentType: input.contentType?.trim() || null,
          attachmentFileDataUrl: input.attachmentFileDataUrl?.trim() || null,
          attachmentFileName: input.attachmentFileName?.trim() || null,
          notes: input.notes?.trim() || null,
          issuedBy: ctx.user.id,
        } as any);
        await logAuditEvent(
          ctx.user.id,
          "CREATE",
          "levelIII_technician_certificate",
          Number(created?.id ?? 0) || input.technicianId,
          buildLevelIIITechnicianCertificateAuditSnapshot(created ?? input),
          getAuditRequestMeta(ctx).ipAddress,
          getAuditRequestMeta(ctx).userAgent
        );
        const autoSupersededCertificates = getAutoSupersededLevelIIITechnicianCertificates(created);
        if (created && autoSupersededCertificates.length > 0) {
          await logAuditEvent(
            ctx.user.id,
            "UPDATE",
            "levelIII_technician_certificate",
            Number(created.id),
            {
              eventType: "auto_supersede_replacement",
              replacementCertificateNumber: created.certificateNumber ?? null,
              supersededCertificateNumbers: autoSupersededCertificates.map(
                (certificate) => certificate.certificateNumber ?? `#${certificate.id}`
              ),
              supersededCount: autoSupersededCertificates.length,
            },
            getAuditRequestMeta(ctx).ipAddress,
            getAuditRequestMeta(ctx).userAgent
          );
          for (const certificate of autoSupersededCertificates) {
            await logAuditEvent(
              ctx.user.id,
              "UPDATE",
              "levelIII_technician_certificate",
              certificate.id,
              {
                eventType: "auto_superseded",
                previousStatus: "Active",
                newStatus: "Superseded",
                replacementCertificateId: created.id,
                replacementCertificateNumber: created.certificateNumber ?? null,
              },
              getAuditRequestMeta(ctx).ipAddress,
              getAuditRequestMeta(ctx).userAgent
            );
          }
        }
        return created;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            technicianId: z.number().optional(),
            assessmentId: z.number().optional().nullable(),
            certificateNumber: z.string().optional().nullable(),
            method: z.string().min(1).optional(),
            level: z.string().min(1).optional(),
            methodLevels: z
              .array(
                z.object({
                  method: z.string().min(1),
                  level: z.string().min(1),
                })
              )
              .min(1)
              .optional(),
            issuedDate: z.date().optional(),
            validUntil: z.date().optional().nullable(),
            validityValue: z.number().int().positive().optional().nullable(),
            validityUnit: z.enum(["days", "months", "years", "custom"]).optional().nullable(),
            status: z.enum(["Active", "Expired", "Revoked", "Superseded"]).optional(),
            fileName: z.string().optional().nullable(),
            fileUrl: z.string().url().optional().or(z.literal("")).nullable(),
            fileKey: z.string().optional().nullable(),
            contentType: z.string().optional().nullable(),
            attachmentFileDataUrl: z.string().optional().nullable(),
            attachmentFileName: z.string().optional().nullable(),
            notes: z.string().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existingCertificate =
          (await getAllLevelIIITechnicianCertificates()).find((certificate) => certificate.id === input.id) ??
          null;
        const updated = await updateLevelIIITechnicianCertificate(input.id, {
          ...input.data,
          certificateNumber:
            input.data.certificateNumber === undefined
              ? undefined
              : input.data.certificateNumber?.trim() || null,
          fileName:
            input.data.fileName === undefined ? undefined : input.data.fileName?.trim() || null,
          fileUrl:
            input.data.fileUrl === undefined ? undefined : input.data.fileUrl?.trim() || null,
          fileKey:
            input.data.fileKey === undefined ? undefined : input.data.fileKey?.trim() || null,
          contentType:
            input.data.contentType === undefined
              ? undefined
              : input.data.contentType?.trim() || null,
          attachmentFileDataUrl:
            input.data.attachmentFileDataUrl === undefined
              ? undefined
              : input.data.attachmentFileDataUrl?.trim() || null,
          attachmentFileName:
            input.data.attachmentFileName === undefined
              ? undefined
              : input.data.attachmentFileName?.trim() || null,
          notes: input.data.notes === undefined ? undefined : input.data.notes?.trim() || null,
          issuedBy: ctx.user.id,
        } as any);
        if (existingCertificate && updated) {
          await logAuditEvent(
            ctx.user.id,
            "UPDATE",
            "levelIII_technician_certificate",
            input.id,
            buildLevelIIITechnicianCertificateUpdateAuditChanges(existingCertificate, updated),
            getAuditRequestMeta(ctx).ipAddress,
            getAuditRequestMeta(ctx).userAgent
          );
          const autoSupersededCertificates = getAutoSupersededLevelIIITechnicianCertificates(updated);
          if (autoSupersededCertificates.length > 0) {
            await logAuditEvent(
              ctx.user.id,
              "UPDATE",
              "levelIII_technician_certificate",
              input.id,
              {
                eventType: "auto_supersede_replacement",
                replacementCertificateNumber: (updated as any).certificateNumber ?? null,
                supersededCertificateNumbers: autoSupersededCertificates.map(
                  (certificate) => certificate.certificateNumber ?? `#${certificate.id}`
                ),
                supersededCount: autoSupersededCertificates.length,
              },
              getAuditRequestMeta(ctx).ipAddress,
              getAuditRequestMeta(ctx).userAgent
            );
            for (const certificate of autoSupersededCertificates) {
              await logAuditEvent(
                ctx.user.id,
                "UPDATE",
                "levelIII_technician_certificate",
                certificate.id,
                {
                  eventType: "auto_superseded",
                  previousStatus: "Active",
                  newStatus: "Superseded",
                  replacementCertificateId: input.id,
                  replacementCertificateNumber: (updated as any).certificateNumber ?? null,
                },
                getAuditRequestMeta(ctx).ipAddress,
                getAuditRequestMeta(ctx).userAgent
              );
            }
          }
        }
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existingCertificate =
          (await getAllLevelIIITechnicianCertificates()).find((certificate) => certificate.id === input.id) ??
          null;
        await deleteLevelIIITechnicianCertificate(input.id);
        if (existingCertificate) {
          await logAuditEvent(
            ctx.user.id,
            "DELETE",
            "levelIII_technician_certificate",
            input.id,
            buildLevelIIITechnicianCertificateAuditSnapshot(existingCertificate),
            getAuditRequestMeta(ctx).ipAddress,
            getAuditRequestMeta(ctx).userAgent
          );
        }
        return { success: true };
      }),

    recordExport: protectedProcedure
      .input(
        z.object({
          certificateId: z.number(),
          exportFormat: z.enum(["html", "pdf"]),
          fileName: z.string().min(1),
          title: z.string().optional().nullable(),
          subtitle: z.string().optional().nullable(),
          artifactSummary: z.record(z.string(), z.string().nullable()).optional().nullable(),
          artifactPayload: z.record(z.string(), z.unknown()).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const recorded = await recordLevelIIITechnicianCertificateExport({
          certificateId: input.certificateId,
          exportFormat: input.exportFormat,
          fileName: input.fileName.trim(),
          title: input.title?.trim() || null,
          subtitle: input.subtitle?.trim() || null,
          artifactSummary: input.artifactSummary ?? null,
          artifactPayload: input.artifactPayload ?? null,
          exportedByUserId: ctx.user.id,
        });
        await logAuditEvent(
          ctx.user.id,
          "EXPORT",
          "levelIII_technician_certificate",
          input.certificateId,
          {
            exportFormat: input.exportFormat,
            fileName: input.fileName.trim(),
            title: input.title?.trim() || null,
            subtitle: input.subtitle?.trim() || null,
          },
          getAuditRequestMeta(ctx).ipAddress,
          getAuditRequestMeta(ctx).userAgent
        );
        return recorded;
      }),
  }),

  assessments: router({
    list: protectedProcedure.query(async () => {
      return getAllLevelIIIAssessments();
    }),

    create: protectedProcedure
      .input(
        z.object({
          technicianId: z.number(),
          assessmentDate: z.date(),
          method: z.string().min(1).optional(),
          level: z.string().min(1).optional(),
          methodLevels: z
            .array(
              z.object({
                method: z.string().min(1),
                level: z.string().min(1),
              })
            )
            .min(1),
          assessor: z.string().min(1),
          result: z.enum(["Pass", "Fail", "Observation", "Pending Review"]),
          nextReviewDate: z.date().optional().nullable(),
          evidenceUrl: z.string().url().optional().or(z.literal("")).nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        return createLevelIIIAssessment({
          ...input,
          evidenceUrl: input.evidenceUrl?.trim() || null,
          notes: input.notes?.trim() || null,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            technicianId: z.number().optional(),
            assessmentDate: z.date().optional(),
            method: z.string().min(1).optional(),
            level: z.string().min(1).optional(),
            methodLevels: z
              .array(
                z.object({
                  method: z.string().min(1),
                  level: z.string().min(1),
                })
              )
              .min(1)
              .optional(),
            assessor: z.string().min(1).optional(),
            result: z.enum(["Pass", "Fail", "Observation", "Pending Review"]).optional(),
            nextReviewDate: z.date().optional().nullable(),
            evidenceUrl: z.string().url().optional().or(z.literal("")).nullable(),
            notes: z.string().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return updateLevelIIIAssessment(input.id, {
          ...input.data,
          evidenceUrl:
            input.data.evidenceUrl === undefined
              ? undefined
              : input.data.evidenceUrl?.trim() || null,
          notes:
            input.data.notes === undefined
              ? undefined
              : input.data.notes?.trim() || null,
        } as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLevelIIIAssessment(input.id);
        return { success: true };
      }),
  }),

  equipment: router({
    list: protectedProcedure.query(async () => {
      return getAllLevelIIIEquipment();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          serialNumber: z.string().min(1),
          status: z.enum(["Available", "In Service", "Calibration Due", "Out of Service"]),
          sharedWithMainEquipment: z.boolean(),
          owner: z.string().min(1),
          calibrationType: z.string().optional().nullable(),
          lastServiceDate: z.date().optional().nullable(),
          nextDueDate: z.date().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        return createLevelIIIEquipment({
          ...input,
          notes: input.notes?.trim() || null,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            name: z.string().min(1).optional(),
            serialNumber: z.string().min(1).optional(),
            status: z.enum(["Available", "In Service", "Calibration Due", "Out of Service"]).optional(),
            sharedWithMainEquipment: z.boolean().optional(),
            owner: z.string().min(1).optional(),
            calibrationType: z.string().optional().nullable(),
            lastServiceDate: z.date().optional().nullable(),
            nextDueDate: z.date().optional().nullable(),
            notes: z.string().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return updateLevelIIIEquipment(input.id, {
          ...input.data,
          notes:
            input.data.notes === undefined
              ? undefined
              : input.data.notes?.trim() || null,
        } as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLevelIIIEquipment(input.id);
        return { success: true };
      }),
  }),

  specimens: router({
    list: protectedProcedure.query(async () => {
      return getAllLevelIIISpecimens();
    }),

    create: protectedProcedure
      .input(
        z.object({
          specimenNumber: z.string().min(1),
          name: z.string().min(1),
          specimenType: z.string().min(1),
          status: z.enum(["Available", "In Use", "Shared", "Retired"]),
          sharedWithMainSpecimens: z.boolean(),
          masteringStatus: z.enum(["Mastered", "Re-master Required", "Pending"]).optional(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        return createLevelIIISpecimen({
          ...input,
          notes: input.notes?.trim() || null,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            specimenNumber: z.string().min(1).optional(),
            name: z.string().min(1).optional(),
            specimenType: z.string().min(1).optional(),
            status: z.enum(["Available", "In Use", "Shared", "Retired"]).optional(),
            sharedWithMainSpecimens: z.boolean().optional(),
            masteringStatus: z.enum(["Mastered", "Re-master Required", "Pending"]).optional(),
            notes: z.string().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return updateLevelIIISpecimen(input.id, {
          ...input.data,
          notes:
            input.data.notes === undefined
              ? undefined
              : input.data.notes?.trim() || null,
        } as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLevelIIISpecimen(input.id);
        return { success: true };
      }),
  }),
});

export { levelIIIRouter };
