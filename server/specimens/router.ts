import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { specimens } from "../../drizzle/schema";
import {
  getAllSpecimens,
  getSpecimenById,
  createSpecimen,
  updateSpecimen,
  getSpecimenDocuments,
  createSpecimenDocument,
  deleteSpecimenDocument,
  getSpecimenLoans,
  createSpecimenLoan,
  returnSpecimenLoan,
  getAllSpecimenTypes,
  createSpecimenType,
  updateSpecimenType,
} from "../db";

export const specimensRouter = router({
  list: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllSpecimens(input?.branchId);
    }),

  get: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const specimen = await getSpecimenById(input);
      if (!specimen) throw new TRPCError({ code: "NOT_FOUND" });
      return specimen;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        specimenTypeId: z.number(),
        serialNumber: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        status: z.enum(["Available", "In Use", "Loaned Out", "Quarantine", "Retired"]).optional(),
        masteringStatus: z.enum(["Mastered", "Re-master Required", "Pending"]).optional(),
        branchId: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return createSpecimen(input as any);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          specimenTypeId: z.number().optional(),
          serialNumber: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          status: z.enum(["Available", "In Use", "Loaned Out", "Quarantine", "Retired"]).optional(),
          masteringStatus: z.enum(["Mastered", "Re-master Required", "Pending"]).optional(),
          branchId: z.number().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateSpecimen(input.id, input.data);
    }),

  documents: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getSpecimenDocuments(input);
    }),

  addDocument: protectedProcedure
    .input(
      z.object({
        specimenId: z.number(),
        label: z.string(),
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      return createSpecimenDocument(input as any);
    }),

  loans: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getSpecimenLoans(input);
    }),

  createLoan: protectedProcedure
    .input(
      z.object({
        specimenId: z.number(),
        fromBranchId: z.number(),
        toBranchId: z.number(),
        loanDate: z.date(),
        expectedReturnDate: z.date().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return createSpecimenLoan({
        ...input,
        notes: input.notes?.trim() || null,
        expectedReturnDate: input.expectedReturnDate ?? null,
      } as any);
    }),

  returnLoan: protectedProcedure
    .input(z.object({ loanId: z.number() }))
    .mutation(async ({ input }) => {
      return returnSpecimenLoan(input.loanId);
    }),

  removeDocument: protectedProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      return deleteSpecimenDocument(input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(specimens).where(eq(specimens.id, input.id));
      return { success: true };
    }),

  types: protectedProcedure.query(async () => {
    return getAllSpecimenTypes();
  }),

  createType: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        material: z.string().optional(),
        size: z.string().optional(),
        weight: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createSpecimenType({
        ...input,
        material: input.material?.trim() || null,
        size: input.size?.trim() || null,
        weight: input.weight?.trim() || null,
        description: input.description?.trim() || null,
      } as any);
    }),

  updateType: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string(),
          material: z.string().optional(),
          size: z.string().optional(),
          weight: z.string().optional(),
          description: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateSpecimenType(input.id, {
        name: input.data.name.trim(),
        material: input.data.material?.trim() || null,
        size: input.data.size?.trim() || null,
        weight: input.data.weight?.trim() || null,
        description: input.data.description?.trim() || null,
      } as any);
    }),
});
