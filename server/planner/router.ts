import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllUsers,
  getUserById,
  getUserModuleAccess,
  getPortalAccessibleClientsForUser,
  getPlannerEntriesByUser,
  createPlannerEntry,
  updatePlannerEntryForUser,
  deletePlannerEntryForUser,
  getPlannerTimesheetProfile,
  upsertPlannerTimesheetProfile,
  listPlannerTimesheetDepartmentCoverageSettings,
  upsertPlannerTimesheetDepartmentCoverageSetting,
  deletePlannerTimesheetDepartmentCoverageSetting,
  getPlannerTimesheetHolidays,
  createPlannerTimesheetHoliday,
  updatePlannerTimesheetHoliday,
  deletePlannerTimesheetHoliday,
  applyPlannerTimesheetHolidaysToMonth,
  fillPlannerTimesheetMonthFromProfileTemplates,
  getPlannerTimesheetMonthStatus,
  lockPlannerTimesheetMonth,
  reopenPlannerTimesheetMonth,
  submitPlannerTimesheetMonth,
  approvePlannerTimesheetMonth,
  markPlannerTimesheetMonthHandedOff,
  returnPlannerTimesheetMonthForChanges,
  getPlannerTimesheetReviewQueue,
  getPlannerTimesheetMonthOverview,
  getPlannerTimesheetTeamLeaveOverview,
  getPlannerTimesheetLeaveOverrideRegister,
  getPlannerTimesheetLeaveOverrideBlocks,
  getPlannerTimesheetUserLeaveOverrideRegister,
  getPlannerTimesheetUserLeaveOverrideBlocks,
  reviewPlannerTimesheetLeaveOverride,
  reviewPlannerTimesheetLeaveOverrideBlock,
  getPlannerTimesheetTeamLeaveCalendar,
  getPlannerTimesheetDepartmentCoveragePreview,
  getPlannerTimesheetLeaveBalancePreview,
  getPlannerTimesheetTemplates,
  getPlannerTimesheetOptions,
  createPlannerTimesheetTemplate,
  updatePlannerTimesheetTemplateForUser,
  deletePlannerTimesheetTemplateForUser,
  createPlannerTimesheetOption,
  updatePlannerTimesheetOptionForUser,
  deletePlannerTimesheetOptionForUser,
  getPlannerTimesheetEntriesByUser,
  upsertPlannerTimesheetEntryForUser,
  bulkUpsertPlannerTimesheetEntriesForUser,
  ensureUserCalendarFeedToken,
  rotateUserCalendarFeedToken,
  getAllSharedPlannerEvents,
  createSharedPlannerEvent,
  updateSharedPlannerEventForUser,
  deleteSharedPlannerEventForUser,
  getUnifiedCalendarOccurrencesForUser,
} from "../db";
import { logAuditEvent } from "../audit";
import { ENV } from "../_core/env";

function getSessionCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: (ENV.isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}

function getLocalAuthLogoutCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: (ENV.isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: 1000 * 60 * 60 * 24 * 365,
  };
}

function getCookieClearOptions(
  options: ReturnType<typeof getSessionCookieOptions> | ReturnType<typeof getLocalAuthLogoutCookieOptions>
) {
  const { maxAge: _maxAge, ...clearOptions } = options;
  return clearOptions;
}

const AVAILABLE_MODULES = [
  "students",
  "leads",
  "companies",
  "courses",
  "schedules",
  "enrollments",
  "attendance",
  "equipment",
  "specimens",
  "kpi",
  "lecturers",
  "training",
  "level_ii",
  "planner",
  "reports",
  "documents",
  "level_iii",
  "client_portal",
  "quality",
  "branches",
  "admin",
];

type AvailableModule = (typeof AVAILABLE_MODULES)[number];
type ModulePermissionAction = "view" | "create" | "edit" | "delete";

async function assertModulePermission(
  user: NonNullable<Awaited<ReturnType<typeof getUserById>>>,
  module: AvailableModule,
  action: ModulePermissionAction = "view"
) {
  if (user.role === "admin" || user.role === "super_admin") {
    return;
  }

  if (module === "client_portal") {
    const portalClients = await getPortalAccessibleClientsForUser(user.id, user.role);
    if (portalClients.length > 0) {
      return;
    }
  }

  const rows = await getUserModuleAccess(user.id);
  const access = rows.find((row) => row.module === module);
  const allowed =
    action === "view"
      ? Boolean(access?.canView)
      : action === "create"
        ? Boolean(access?.canCreate)
        : action === "edit"
          ? Boolean(access?.canEdit)
          : Boolean(access?.canDelete);

  if (allowed) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: `You do not have ${action} access for the ${module.replace(/_/g, " ")} module.`,
  });
}

function moduleProcedure(module: AvailableModule, action: ModulePermissionAction = "view") {
  return protectedProcedure.use(async ({ ctx, next }) => {
    await assertModulePermission(ctx.user, module, action);
    return next({
      ctx,
    });
  });
}

const plannerViewProcedure = moduleProcedure("planner", "view");
const plannerCreateProcedure = moduleProcedure("planner", "create");
const plannerEditProcedure = moduleProcedure("planner", "edit");
const plannerDeleteProcedure = moduleProcedure("planner", "delete");
const adminModuleProcedure = moduleProcedure("admin", "view");

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

function formatPlannerTimesheetMonthParam(value: Date) {
  const monthStart = new Date(value.getFullYear(), value.getMonth(), 1);
  const year = monthStart.getFullYear();
  const month = String(monthStart.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function buildPlannerTimesheetActionUrl(options: {
  monthStart: Date;
  userId?: number | null;
  review?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  entryDate?: Date | null;
}) {
  const params = new URLSearchParams();
  params.set("timesheetMonth", formatPlannerTimesheetMonthParam(options.monthStart));
  if (options.entryDate) {
    params.set(
      "timesheetDate",
      `${options.entryDate.getFullYear()}-${String(options.entryDate.getMonth() + 1).padStart(2, "0")}-${String(
        options.entryDate.getDate()
      ).padStart(2, "0")}`
    );
  }
  if (options.userId) {
    params.set("timesheetUserId", String(options.userId));
  }
  if (options.review) {
    params.set("timesheetReview", "1");
  }
  if (options.userName?.trim()) {
    params.set("timesheetUserName", options.userName.trim());
  }
  if (options.userEmail?.trim()) {
    params.set("timesheetUserEmail", options.userEmail.trim());
  }
  return `/planner?${params.toString()}`;
}

function resolvePlannerTimesheetTargetUserId(
  ctxUser: { id: number; role: "user" | "admin" | "super_admin" },
  requestedUserId?: number | null
) {
  if (!requestedUserId || requestedUserId === ctxUser.id) {
    return ctxUser.id;
  }

  if (!["admin", "super_admin"].includes(ctxUser.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only internal admins can review another user's timesheet.",
    });
  }

  return requestedUserId;
}

export const plannerRouter = router({
  list: plannerViewProcedure.query(async ({ ctx }) => {
    return getPlannerEntriesByUser(ctx.user.id);
  }),

  create: plannerCreateProcedure
    .input(
      z.object({
        title: z.string(),
        entryDate: z.date(),
        notes: z.string().optional().nullable(),
        reminderAt: z.date().optional().nullable(),
        isComplete: z.boolean().optional(),
        recurrence: z.enum(["Daily", "Weekly", "Monthly"]).optional().nullable(),
        recurrenceUntil: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createPlannerEntry({
        userId: ctx.user.id,
        title: input.title.trim(),
        entryDate: input.entryDate,
        notes: input.notes?.trim() || null,
        reminderAt: input.reminderAt ?? null,
        isComplete: input.isComplete ?? false,
        recurrence: input.recurrence ?? null,
        recurrenceUntil: input.recurrenceUntil ?? null,
      } as any);
    }),

  update: plannerEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          entryDate: z.date().optional(),
          notes: z.string().optional().nullable(),
          reminderAt: z.date().optional().nullable(),
          isComplete: z.boolean().optional(),
          recurrence: z.enum(["Daily", "Weekly", "Monthly"]).optional().nullable(),
          recurrenceUntil: z.date().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updatePlannerEntryForUser(ctx.user.id, input.id, {
        title:
          input.data.title === undefined ? undefined : input.data.title.trim(),
        entryDate: input.data.entryDate,
        notes:
          input.data.notes === undefined
            ? undefined
            : input.data.notes?.trim() || null,
        reminderAt:
          input.data.reminderAt === undefined ? undefined : input.data.reminderAt,
        isComplete: input.data.isComplete,
        recurrence:
          input.data.recurrence === undefined ? undefined : input.data.recurrence,
        recurrenceUntil:
          input.data.recurrenceUntil === undefined
            ? undefined
            : input.data.recurrenceUntil,
      } as any);
    }),

  delete: plannerDeleteProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePlannerEntryForUser(ctx.user.id, input.id);
      return { success: true };
    }),

  feedInfo: plannerViewProcedure.query(async ({ ctx }) => {
    const token = await ensureUserCalendarFeedToken(ctx.user.id);
    return {
      token,
    };
  }),

  rotateFeedToken: plannerEditProcedure.mutation(async ({ ctx }) => {
    const token = await rotateUserCalendarFeedToken(ctx.user.id);
    return {
      token,
    };
  }),

  timesheets: router({
    profile: plannerViewProcedure
      .input(z.object({ userId: z.number().int().optional().nullable() }).optional())
      .query(async ({ ctx, input }) => {
        const targetUserId = resolvePlannerTimesheetTargetUserId(ctx.user, input?.userId);
        return getPlannerTimesheetProfile(targetUserId);
      }),

    monthStatus: plannerViewProcedure
      .input(z.object({ monthStart: z.date(), userId: z.number().int().optional().nullable() }))
      .query(async ({ ctx, input }) => {
        const targetUserId = resolvePlannerTimesheetTargetUserId(ctx.user, input.userId);
        return getPlannerTimesheetMonthStatus(targetUserId, input.monthStart);
      }),

    reviewQueue: plannerViewProcedure.query(async ({ ctx }) => {
      if (!["admin", "super_admin"].includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only internal admins can review submitted timesheets.",
        });
      }

      return getPlannerTimesheetReviewQueue();
    }),

    overview: plannerViewProcedure
      .input(z.object({ monthStart: z.date() }))
      .query(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can view the team timesheet overview.",
          });
        }

        return getPlannerTimesheetMonthOverview(input.monthStart);
      }),

    teamLeaveOverview: plannerViewProcedure
      .input(z.object({ monthStart: z.date() }))
      .query(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can view the team leave overview.",
          });
        }

        return getPlannerTimesheetTeamLeaveOverview(input.monthStart);
      }),

    teamLeaveOverrides: plannerViewProcedure
      .input(z.object({ monthStart: z.date() }))
      .query(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can view the leave override register.",
          });
        }

        return getPlannerTimesheetLeaveOverrideRegister(input.monthStart);
      }),

    teamLeaveOverrideBlocks: plannerViewProcedure
      .input(z.object({ monthStart: z.date() }))
      .query(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can view the leave override review blocks.",
          });
        }

        return getPlannerTimesheetLeaveOverrideBlocks(input.monthStart);
      }),

    leaveOverrides: plannerViewProcedure
      .input(
        z.object({
          monthStart: z.date(),
          userId: z.number().int().positive().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const targetUserId = input.userId ?? ctx.user.id;
        if (
          targetUserId !== ctx.user.id &&
          !["admin", "super_admin"].includes(ctx.user.role)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view your own leave override history.",
          });
        }

        return getPlannerTimesheetUserLeaveOverrideRegister(targetUserId, input.monthStart);
      }),

    leaveOverrideBlocks: plannerViewProcedure
      .input(
        z.object({
          monthStart: z.date(),
          userId: z.number().int().positive().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const targetUserId = input.userId ?? ctx.user.id;
        if (
          targetUserId !== ctx.user.id &&
          !["admin", "super_admin"].includes(ctx.user.role)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view your own leave override review blocks.",
          });
        }

        return getPlannerTimesheetUserLeaveOverrideBlocks(targetUserId, input.monthStart);
      }),

    reviewLeaveOverride: plannerEditProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          entryDate: z.date(),
          note: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can review leave override entries.",
          });
        }

        const result = await reviewPlannerTimesheetLeaveOverride({
          reviewerUserId: ctx.user.id,
          reviewerName: ctx.user.name ?? ctx.user.email ?? null,
          userId: input.userId,
          entryDate: input.entryDate,
          note: input.note ?? null,
        });

        const { createNotification } = await import("../notifications");
        await createNotification(input.userId, {
          type: "system_alert",
          title: "Leave override reviewed",
          message: `${input.entryDate.toLocaleDateString("en-ZA", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })} was reviewed by ${ctx.user.name?.trim() || ctx.user.email?.trim() || "an admin"}${
            input.note?.trim() ? `: ${input.note.trim()}` : "."
          }`,
          entityType: "plannerTimesheetLeaveOverride",
          actionUrl: buildPlannerTimesheetActionUrl({
            monthStart: input.entryDate,
            entryDate: input.entryDate,
          }),
          priority: "normal",
          relatedUserId: ctx.user.id,
        });

        return result;
      }),

    reviewLeaveOverrideBlock: plannerEditProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          entryDates: z.array(z.date()).min(1),
          note: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can review leave override blocks.",
          });
        }

        const result = await reviewPlannerTimesheetLeaveOverrideBlock({
          reviewerUserId: ctx.user.id,
          reviewerName: ctx.user.name ?? ctx.user.email ?? null,
          userId: input.userId,
          entryDates: input.entryDates,
          note: input.note ?? null,
        });

        const [firstDate, lastDate] = result.entryDates;
        const formatDateLabel = (value: Date) =>
          value.toLocaleDateString("en-ZA", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
        const dateRangeLabel =
          firstDate && lastDate && firstDate.getTime() !== lastDate.getTime()
            ? `${formatDateLabel(firstDate)} to ${formatDateLabel(lastDate)}`
            : firstDate
              ? formatDateLabel(firstDate)
              : "the selected leave period";

        const { createNotification } = await import("../notifications");
        await createNotification(input.userId, {
          type: "system_alert",
          title: "Leave override block reviewed",
          message: `${dateRangeLabel} was reviewed by ${
            ctx.user.name?.trim() || ctx.user.email?.trim() || "an admin"
          }${input.note?.trim() ? `: ${input.note.trim()}` : "."}`,
          entityType: "plannerTimesheetLeaveOverride",
          actionUrl: buildPlannerTimesheetActionUrl({
            monthStart: firstDate ?? input.entryDates[0],
            entryDate: firstDate ?? input.entryDates[0],
          }),
          priority: "normal",
          relatedUserId: ctx.user.id,
        });

        return result;
      }),

    teamLeaveCalendar: plannerViewProcedure
      .input(z.object({ monthStart: z.date() }))
      .query(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can view the team leave calendar.",
          });
        }

        return getPlannerTimesheetTeamLeaveCalendar(input.monthStart);
      }),

    departmentCoveragePreview: plannerViewProcedure
      .input(
        z.object({
          userId: z.number().int().optional().nullable(),
          fromDate: z.date(),
          toDate: z.date(),
          includeWeekends: z.boolean().optional(),
          skipSharedHolidays: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const targetUserId = resolvePlannerTimesheetTargetUserId(ctx.user, input.userId);
        return getPlannerTimesheetDepartmentCoveragePreview(
          targetUserId,
          input.fromDate,
          input.toDate,
          {
            includeWeekends: input.includeWeekends ?? false,
            skipSharedHolidays: input.skipSharedHolidays ?? true,
          }
        );
      }),

    leaveBalancePreview: plannerViewProcedure
      .input(
        z.object({
          userId: z.number().int().optional().nullable(),
          fromDate: z.date(),
          toDate: z.date(),
          includeWeekends: z.boolean().optional(),
          overwriteExisting: z.boolean().optional(),
          skipSharedHolidays: z.boolean().optional(),
          leavePortionPercent: z.number().int().optional().nullable(),
        })
      )
      .query(async ({ ctx, input }) => {
        const targetUserId = resolvePlannerTimesheetTargetUserId(ctx.user, input.userId);
        return getPlannerTimesheetLeaveBalancePreview(
          targetUserId,
          input.fromDate,
          input.toDate,
          {
            includeWeekends: input.includeWeekends ?? false,
            overwriteExisting: input.overwriteExisting ?? true,
            skipSharedHolidays: input.skipSharedHolidays ?? true,
            leavePortionPercent: input.leavePortionPercent ?? 100,
          }
        );
      }),

    departmentCoverageSettings: router({
      list: plannerViewProcedure.query(async ({ ctx }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can view department coverage rules.",
          });
        }

        return listPlannerTimesheetDepartmentCoverageSettings();
      }),

      save: plannerEditProcedure
        .input(
          z.object({
            id: z.number().int().optional().nullable(),
            department: z.string().min(1),
            minimumAvailableCount: z.number().int().min(0).optional().nullable(),
            maximumPeopleOff: z.number().int().min(0).optional().nullable(),
            mediumRiskPercent: z.number().int().min(0).max(100).optional().nullable(),
            highRiskPercent: z.number().int().min(0).max(100).optional().nullable(),
            notes: z.string().optional().nullable(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          if (!["admin", "super_admin"].includes(ctx.user.role)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only internal admins can edit department coverage rules.",
            });
          }

          return upsertPlannerTimesheetDepartmentCoverageSetting(ctx.user.id, {
            id: input.id ?? null,
            department: input.department.trim(),
            minimumAvailableCount: input.minimumAvailableCount ?? null,
            maximumPeopleOff: input.maximumPeopleOff ?? null,
            mediumRiskPercent: input.mediumRiskPercent ?? 25,
            highRiskPercent: input.highRiskPercent ?? 50,
            notes: input.notes?.trim() || null,
          });
        }),

      delete: plannerDeleteProcedure
        .input(z.object({ id: z.number().int() }))
        .mutation(async ({ ctx, input }) => {
          if (!["admin", "super_admin"].includes(ctx.user.role)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only internal admins can remove department coverage rules.",
            });
          }

          return deletePlannerTimesheetDepartmentCoverageSetting(input.id);
        }),
    }),

    lockMonth: plannerEditProcedure
      .input(
        z.object({
          monthStart: z.date(),
          note: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return lockPlannerTimesheetMonth(
          ctx.user.id,
          input.monthStart,
          ctx.user.name ?? ctx.user.email ?? null,
          input.note ?? null
        );
      }),

    reopenMonth: plannerEditProcedure
      .input(
        z.object({
          monthStart: z.date(),
          note: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return reopenPlannerTimesheetMonth(
          ctx.user.id,
          input.monthStart,
          ctx.user.name ?? ctx.user.email ?? null,
          input.note ?? null
        );
      }),

    submitMonth: plannerEditProcedure
      .input(
        z.object({
          monthStart: z.date(),
          note: z.string().optional().nullable(),
          declarationAccepted: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const status = await submitPlannerTimesheetMonth(
          ctx.user.id,
          input.monthStart,
          ctx.user.name ?? ctx.user.email ?? null,
          input.note ?? null,
          {
            declarationAccepted: input.declarationAccepted ?? false,
          }
        );

        const { createNotification } = await import("../notifications");
        const allUsers = await getAllUsers();
        const reviewerIds = allUsers
          .filter((row) => row.role === "admin" || row.role === "super_admin")
          .map((row) => row.id)
          .filter((id) => id !== ctx.user.id);
        await Promise.all(
          reviewerIds.map((reviewerId) =>
            createNotification(reviewerId, {
              type: "system_alert",
              title: "Timesheet ready for review",
              message: `${ctx.user.name?.trim() || ctx.user.email?.trim() || "A user"} submitted ${input.monthStart.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })} for review.`,
              entityType: "plannerTimesheetMonth",
              entityId: status?.id,
              actionUrl: buildPlannerTimesheetActionUrl({
                monthStart: input.monthStart,
                userId: ctx.user.id,
                review: true,
                userName: ctx.user.name ?? ctx.user.email ?? null,
                userEmail: ctx.user.email ?? null,
              }),
              priority: "normal",
              relatedUserId: ctx.user.id,
            })
          )
        );

        return status;
      }),

    approveMonth: plannerEditProcedure
      .input(
        z.object({
          userId: z.number().int(),
          monthStart: z.date(),
          note: z.string().optional().nullable(),
          reviewerDeclarationAccepted: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can approve submitted timesheets.",
          });
        }

        const status = await approvePlannerTimesheetMonth(
          ctx.user.id,
          ctx.user.name ?? ctx.user.email ?? null,
          input.userId,
          input.monthStart,
          input.note ?? null,
          {
            reviewerDeclarationAccepted: input.reviewerDeclarationAccepted ?? false,
          }
        );

        const { createNotification } = await import("../notifications");
        await createNotification(input.userId, {
          type: "system_alert",
          title: "Timesheet approved",
          message: `${input.monthStart.toLocaleDateString("en-ZA", {
            month: "long",
            year: "numeric",
          })} was approved${input.note?.trim() ? `: ${input.note.trim()}` : "."}`,
          entityType: "plannerTimesheetMonth",
          entityId: status?.id,
          actionUrl: buildPlannerTimesheetActionUrl({
            monthStart: input.monthStart,
          }),
          priority: "normal",
          relatedUserId: ctx.user.id,
        });

        return status;
      }),

    markMonthHandedOff: plannerEditProcedure
      .input(
        z.object({
          userId: z.number().int(),
          monthStart: z.date(),
          note: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can hand off approved timesheets.",
          });
        }

        const status = await markPlannerTimesheetMonthHandedOff(
          ctx.user.id,
          ctx.user.name ?? ctx.user.email ?? null,
          input.userId,
          input.monthStart,
          input.note ?? null
        );

        const { createNotification } = await import("../notifications");
        await createNotification(input.userId, {
          type: "system_alert",
          title: "Timesheet handed off",
          message: `${input.monthStart.toLocaleDateString("en-ZA", {
            month: "long",
            year: "numeric",
          })} was handed off for payroll or admin processing${
            input.note?.trim() ? `: ${input.note.trim()}` : "."
          }`,
          entityType: "plannerTimesheetMonth",
          entityId: status?.id,
          actionUrl: buildPlannerTimesheetActionUrl({
            monthStart: input.monthStart,
          }),
          priority: "normal",
          relatedUserId: ctx.user.id,
        });

        return status;
      }),

    returnMonthForChanges: plannerEditProcedure
      .input(
        z.object({
          userId: z.number().int(),
          monthStart: z.date(),
          note: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can return submitted timesheets for changes.",
          });
        }

        const status = await returnPlannerTimesheetMonthForChanges(
          ctx.user.id,
          ctx.user.name ?? ctx.user.email ?? null,
          input.userId,
          input.monthStart,
          input.note ?? null
        );

        const { createNotification } = await import("../notifications");
        await createNotification(input.userId, {
          type: "system_alert",
          title: "Timesheet returned for changes",
          message: `${input.monthStart.toLocaleDateString("en-ZA", {
            month: "long",
            year: "numeric",
          })} was returned for changes${input.note?.trim() ? `: ${input.note.trim()}` : "."}`,
          entityType: "plannerTimesheetMonth",
          entityId: status?.id,
          actionUrl: buildPlannerTimesheetActionUrl({
            monthStart: input.monthStart,
          }),
          priority: "high",
          relatedUserId: ctx.user.id,
        });

        return status;
      }),

    saveProfile: plannerEditProcedure
      .input(
        z.object({
          department: z.string().optional().nullable(),
          signatureName: z.string().optional().nullable(),
          personalLeaveAllowanceDays: z.number().int().min(0).optional().nullable(),
          personalLeaveCarryOverDays: z.number().int().min(0).optional().nullable(),
          leaveYearStartMonth: z.number().int().min(1).max(12).optional().nullable(),
          monThuStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
          monThuEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
          fridayStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
          fridayEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
          weekendStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
          weekendEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
          monThuTemplateId: z.number().int().optional().nullable(),
          fridayTemplateId: z.number().int().optional().nullable(),
          weekendTemplateId: z.number().int().optional().nullable(),
          lunchBreakMinutes: z.number().int().min(0).optional().nullable(),
          teaBreakMinutes: z.number().int().min(0).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertPlannerTimesheetProfile(ctx.user.id, {
          department: input.department?.trim() || null,
          signatureName: input.signatureName?.trim() || null,
          personalLeaveAllowanceDays: input.personalLeaveAllowanceDays ?? null,
          personalLeaveCarryOverDays: input.personalLeaveCarryOverDays ?? 0,
          leaveYearStartMonth: input.leaveYearStartMonth ?? 1,
          monThuStartTime: input.monThuStartTime?.trim() || null,
          monThuEndTime: input.monThuEndTime?.trim() || null,
          fridayStartTime: input.fridayStartTime?.trim() || null,
          fridayEndTime: input.fridayEndTime?.trim() || null,
          weekendStartTime: input.weekendStartTime?.trim() || null,
          weekendEndTime: input.weekendEndTime?.trim() || null,
          monThuTemplateId: input.monThuTemplateId ?? null,
          fridayTemplateId: input.fridayTemplateId ?? null,
          weekendTemplateId: input.weekendTemplateId ?? null,
          lunchBreakMinutes: input.lunchBreakMinutes ?? 60,
          teaBreakMinutes: input.teaBreakMinutes ?? 30,
        });
      }),

    holidays: router({
      list: plannerViewProcedure
        .input(
          z
            .object({
              userId: z.number().int().optional().nullable(),
              fromDate: z.date().optional().nullable(),
              toDate: z.date().optional().nullable(),
            })
            .optional()
        )
        .query(async ({ ctx, input }) => {
          const targetUserId = resolvePlannerTimesheetTargetUserId(ctx.user, input?.userId);
          return getPlannerTimesheetHolidays(targetUserId, {
            fromDate: input?.fromDate ?? null,
            toDate: input?.toDate ?? null,
          });
        }),

      create: plannerCreateProcedure
        .input(
          z.object({
            holidayDate: z.date(),
            label: z.string().min(1),
            holidayType: z.enum(["public_holiday", "company_shutdown"]).optional(),
            notes: z.string().optional().nullable(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return createPlannerTimesheetHoliday(ctx.user.id, {
            holidayDate: input.holidayDate,
            label: input.label.trim(),
            holidayType: input.holidayType ?? "public_holiday",
            notes: input.notes?.trim() || null,
          });
        }),

      update: plannerEditProcedure
        .input(
          z.object({
            id: z.number().int(),
            data: z.object({
              holidayDate: z.date().optional().nullable(),
              label: z.string().min(1).optional(),
              holidayType: z.enum(["public_holiday", "company_shutdown"]).optional(),
              notes: z.string().optional().nullable(),
            }),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return updatePlannerTimesheetHoliday(ctx.user.id, input.id, {
            holidayDate: input.data.holidayDate ?? undefined,
            label: input.data.label?.trim(),
            holidayType: input.data.holidayType,
            notes:
              input.data.notes === undefined ? undefined : input.data.notes?.trim() || null,
          });
        }),

      delete: plannerDeleteProcedure
        .input(z.object({ id: z.number().int() }))
        .mutation(async ({ ctx, input }) => {
          return deletePlannerTimesheetHoliday(ctx.user.id, input.id);
        }),

      applyMonth: plannerEditProcedure
        .input(
          z.object({
            monthStart: z.date(),
            overwriteExisting: z.boolean().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return applyPlannerTimesheetHolidaysToMonth(ctx.user.id, input.monthStart, {
            overwriteExisting: input.overwriteExisting ?? false,
          });
        }),
    }),

    fillMonthFromTemplates: plannerEditProcedure
      .input(
        z.object({
          monthStart: z.date(),
          includeWeekends: z.boolean().optional(),
          overwriteExisting: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return fillPlannerTimesheetMonthFromProfileTemplates(ctx.user.id, input.monthStart, {
          includeWeekends: input.includeWeekends ?? false,
          overwriteExisting: input.overwriteExisting ?? false,
        });
      }),

    templates: router({
      list: plannerViewProcedure.query(async ({ ctx }) => {
        return getPlannerTimesheetTemplates(ctx.user.id);
      }),

      create: plannerCreateProcedure
        .input(
          z.object({
            label: z.string().min(1),
            description: z.string().optional().nullable(),
            startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
            endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
            lunchBreakMinutes: z.number().int().min(0).optional().nullable(),
            teaBreakMinutes: z.number().int().min(0).optional().nullable(),
            leavePortionPercent: z.union([z.literal(50), z.literal(100)]).optional().nullable(),
            selectedOptionIds: z.array(z.number().int()).optional(),
            remarks: z.string().optional().nullable(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return createPlannerTimesheetTemplate(ctx.user.id, {
            label: input.label.trim(),
            description: input.description?.trim() || null,
            startTime: input.startTime?.trim() || null,
            endTime: input.endTime?.trim() || null,
            lunchBreakMinutes: input.lunchBreakMinutes ?? null,
            teaBreakMinutes: input.teaBreakMinutes ?? null,
            leavePortionPercent: input.leavePortionPercent ?? null,
            selectedOptionIds: input.selectedOptionIds ?? [],
            remarks: input.remarks?.trim() || null,
            isActive: input.isActive ?? true,
          });
        }),

      update: plannerEditProcedure
        .input(
          z.object({
            id: z.number().int(),
            data: z.object({
              label: z.string().min(1).optional(),
              description: z.string().optional().nullable(),
              startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
              endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
              lunchBreakMinutes: z.number().int().min(0).optional().nullable(),
              teaBreakMinutes: z.number().int().min(0).optional().nullable(),
              leavePortionPercent: z.union([z.literal(50), z.literal(100)]).optional().nullable(),
              selectedOptionIds: z.array(z.number().int()).optional(),
              remarks: z.string().optional().nullable(),
              isActive: z.boolean().optional(),
            }),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return updatePlannerTimesheetTemplateForUser(ctx.user.id, input.id, {
            label: input.data.label?.trim(),
            description:
              input.data.description === undefined
                ? undefined
                : input.data.description?.trim() || null,
            startTime:
              input.data.startTime === undefined
                ? undefined
                : input.data.startTime?.trim() || null,
            endTime:
              input.data.endTime === undefined
                ? undefined
                : input.data.endTime?.trim() || null,
            lunchBreakMinutes: input.data.lunchBreakMinutes ?? undefined,
            teaBreakMinutes: input.data.teaBreakMinutes ?? undefined,
            leavePortionPercent: input.data.leavePortionPercent ?? undefined,
            selectedOptionIds: input.data.selectedOptionIds ?? undefined,
            remarks:
              input.data.remarks === undefined
                ? undefined
                : input.data.remarks?.trim() || null,
            isActive: input.data.isActive,
          });
        }),

      delete: plannerDeleteProcedure
        .input(z.object({ id: z.number().int() }))
        .mutation(async ({ ctx, input }) => {
          return deletePlannerTimesheetTemplateForUser(ctx.user.id, input.id);
        }),
    }),

    options: router({
      list: plannerViewProcedure
        .input(z.object({ userId: z.number().int().optional().nullable() }).optional())
        .query(async ({ ctx, input }) => {
          const targetUserId = resolvePlannerTimesheetTargetUserId(ctx.user, input?.userId);
          return getPlannerTimesheetOptions(targetUserId);
        }),

      create: plannerCreateProcedure
        .input(
          z.object({
            label: z.string().min(1),
            description: z.string().optional().nullable(),
            sortOrder: z.number().int().optional().nullable(),
            hoursCategory: z.enum(["working", "non_working"]).optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return createPlannerTimesheetOption(ctx.user.id, {
            label: input.label.trim(),
            description: input.description?.trim() || null,
            sortOrder: input.sortOrder ?? null,
            hoursCategory: input.hoursCategory ?? "working",
            isActive: input.isActive ?? true,
          });
        }),

      update: plannerEditProcedure
        .input(
          z.object({
            id: z.number(),
            data: z.object({
              label: z.string().min(1).optional(),
              description: z.string().optional().nullable(),
              sortOrder: z.number().int().optional().nullable(),
              hoursCategory: z.enum(["working", "non_working"]).optional().nullable(),
              isActive: z.boolean().optional(),
            }),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return updatePlannerTimesheetOptionForUser(ctx.user.id, input.id, {
            label: input.data.label?.trim(),
            description:
              input.data.description === undefined
                ? undefined
                : input.data.description?.trim() || null,
            sortOrder: input.data.sortOrder ?? undefined,
            hoursCategory: input.data.hoursCategory ?? undefined,
            isActive: input.data.isActive,
          });
        }),

      delete: plannerDeleteProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          return deletePlannerTimesheetOptionForUser(ctx.user.id, input.id);
        }),
    }),

    entries: router({
      list: plannerViewProcedure
        .input(
          z
            .object({
              userId: z.number().int().optional().nullable(),
              monthStart: z.date().optional(),
              monthEnd: z.date().optional(),
            })
            .optional()
        )
        .query(async ({ ctx, input }) => {
          const targetUserId = resolvePlannerTimesheetTargetUserId(ctx.user, input?.userId);
          return getPlannerTimesheetEntriesByUser(targetUserId, {
            fromDate: input?.monthStart,
            toDate: input?.monthEnd,
          });
        }),

      upsert: plannerEditProcedure
        .input(
          z.object({
            entryDate: z.date(),
            startTime: z.string().optional().nullable(),
            endTime: z.string().optional().nullable(),
            lunchBreakMinutes: z.number().int().min(0).optional().nullable(),
            teaBreakMinutes: z.number().int().min(0).optional().nullable(),
            leavePortionPercent: z.union([z.literal(50), z.literal(100)]).optional().nullable(),
            selectedOptionIds: z.array(z.number().int()).optional(),
            remarks: z.string().optional().nullable(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return upsertPlannerTimesheetEntryForUser(ctx.user.id, {
            entryDate: input.entryDate,
            startTime: input.startTime ?? null,
            endTime: input.endTime ?? null,
            lunchBreakMinutes: input.lunchBreakMinutes ?? null,
            teaBreakMinutes: input.teaBreakMinutes ?? null,
            leavePortionPercent: input.leavePortionPercent ?? null,
            selectedOptionIds: input.selectedOptionIds ?? [],
            remarks: input.remarks ?? null,
          });
        }),

      bulkUpsert: plannerEditProcedure
        .input(
          z.object({
            fromDate: z.date(),
            toDate: z.date(),
            startTime: z.string().optional().nullable(),
            endTime: z.string().optional().nullable(),
            lunchBreakMinutes: z.number().int().min(0).optional().nullable(),
            teaBreakMinutes: z.number().int().min(0).optional().nullable(),
            leavePortionPercent: z.union([z.literal(50), z.literal(100)]).optional().nullable(),
            selectedOptionIds: z.array(z.number().int()).optional(),
            remarks: z.string().optional().nullable(),
            includeWeekends: z.boolean().optional(),
            overwriteExisting: z.boolean().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          return bulkUpsertPlannerTimesheetEntriesForUser(ctx.user.id, {
            fromDate: input.fromDate,
            toDate: input.toDate,
            startTime: input.startTime ?? null,
            endTime: input.endTime ?? null,
            lunchBreakMinutes: input.lunchBreakMinutes ?? null,
            teaBreakMinutes: input.teaBreakMinutes ?? null,
            leavePortionPercent: input.leavePortionPercent ?? null,
            selectedOptionIds: input.selectedOptionIds ?? [],
            remarks: input.remarks ?? null,
            includeWeekends: input.includeWeekends ?? false,
            overwriteExisting: input.overwriteExisting ?? false,
          });
        }),
    }),
  }),

  unified: router({
    list: plannerViewProcedure
      .input(
        z
          .object({
            scope: z.enum(["all", "private", "shared", "operations"]).optional(),
            branchId: z.number().optional(),
            fromDate: z.date().optional(),
            toDate: z.date().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return getUnifiedCalendarOccurrencesForUser(ctx.user.id, {
          scope: input?.scope,
          branchId: input?.branchId,
          fromDate: input?.fromDate,
          toDate: input?.toDate,
        });
      }),
  }),

  shared: router({
    list: plannerViewProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllSharedPlannerEvents(input?.branchId);
      }),

    create: plannerCreateProcedure
      .input(
        z.object({
          title: z.string(),
          eventType: z
            .enum(["Meeting", "Training", "Deadline", "Reminder", "Visit", "General"])
            .optional(),
          branchId: z.number().optional().nullable(),
          startAt: z.date(),
          endAt: z.date().optional().nullable(),
          isAllDay: z.boolean().optional(),
          location: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
          recurrence: z.enum(["Daily", "Weekly", "Monthly"]).optional().nullable(),
          recurrenceUntil: z.date().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createSharedPlannerEvent({
          title: input.title.trim(),
          eventType: input.eventType ?? "General",
          branchId: input.branchId ?? null,
          createdByUserId: ctx.user.id,
          startAt: input.startAt,
          endAt: input.endAt ?? null,
          isAllDay: input.isAllDay ?? false,
          location: input.location?.trim() || null,
          notes: input.notes?.trim() || null,
          recurrence: input.recurrence ?? null,
          recurrenceUntil: input.recurrenceUntil ?? null,
        } as any);
      }),

    update: plannerEditProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            title: z.string().optional(),
            eventType: z
              .enum(["Meeting", "Training", "Deadline", "Reminder", "Visit", "General"])
              .optional(),
            branchId: z.number().optional().nullable(),
            startAt: z.date().optional(),
            endAt: z.date().optional().nullable(),
            isAllDay: z.boolean().optional(),
            location: z.string().optional().nullable(),
            notes: z.string().optional().nullable(),
            recurrence: z.enum(["Daily", "Weekly", "Monthly"]).optional().nullable(),
            recurrenceUntil: z.date().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return updateSharedPlannerEventForUser(
          { id: ctx.user.id, role: ctx.user.role },
          input.id,
          {
            title:
              input.data.title === undefined ? undefined : input.data.title.trim(),
            eventType: input.data.eventType,
            branchId:
              input.data.branchId === undefined ? undefined : input.data.branchId ?? null,
            startAt: input.data.startAt,
            endAt: input.data.endAt === undefined ? undefined : input.data.endAt ?? null,
            isAllDay: input.data.isAllDay,
            location:
              input.data.location === undefined
                ? undefined
                : input.data.location?.trim() || null,
            notes:
              input.data.notes === undefined
                ? undefined
                : input.data.notes?.trim() || null,
            recurrence:
              input.data.recurrence === undefined ? undefined : input.data.recurrence,
            recurrenceUntil:
              input.data.recurrenceUntil === undefined
                ? undefined
                : input.data.recurrenceUntil ?? null,
          } as any
        );
      }),

    delete: plannerDeleteProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSharedPlannerEventForUser(
          { id: ctx.user.id, role: ctx.user.role },
          input.id
        );
        return { success: true };
      }),
  }),
});
