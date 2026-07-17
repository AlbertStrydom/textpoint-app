import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllTrainingOfferings,
  createTrainingOffering,
  updateTrainingOffering,
  deleteTrainingOffering,
} from "../db";

const trainingStatusSchema = z.enum(["Planned", "Active", "Completed", "Cancelled"]);

const trainingOfferingInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  courseId: z.number().optional().nullable(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  status: trainingStatusSchema.optional(),
  branchId: z.number().optional().nullable(),
});

export const trainingRouter = router({
  list: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllTrainingOfferings(input?.branchId);
    }),

  create: protectedProcedure
    .input(trainingOfferingInputSchema)
    .mutation(async ({ input }) => {
      return createTrainingOffering({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        courseId: input.courseId ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        status: input.status ?? "Planned",
        branchId: input.branchId ?? null,
      } as any);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: trainingOfferingInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      return updateTrainingOffering(input.id, {
        ...input.data,
        name: input.data.name === undefined ? undefined : input.data.name.trim(),
        description:
          input.data.description === undefined
            ? undefined
            : input.data.description?.trim() || null,
        courseId: input.data.courseId ?? undefined,
        startDate: input.data.startDate ?? undefined,
        endDate: input.data.endDate ?? undefined,
        branchId: input.data.branchId ?? undefined,
      } as any);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.union([z.number(), z.string()]) }))
    .mutation(async ({ input }) => {
      const numId = typeof input.id === "string" ? parseInt(input.id, 10) : input.id;
      await deleteTrainingOffering(numId);
      return { success: true };
    }),
});
