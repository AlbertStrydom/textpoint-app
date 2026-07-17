import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  getEquipmentDocuments,
  createEquipmentDocument,
  deleteEquipmentDocument,
  getEquipmentLoans,
  createEquipmentLoan,
  returnEquipmentLoan,
  getDb,
} from "../db";

export const equipmentRouter = router({
  list: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllEquipment(input?.branchId);
    }),

  get: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const item = await getEquipmentById(input);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          serialNumber: z.string().optional().nullable(),
          make: z.string().optional().nullable(),
          model: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          domain: z.string().optional().nullable(),
          calibrationType: z.string().optional().nullable(),
          intervalMonths: z.number().optional().nullable(),
          lastServiceDate: z.date().optional().nullable(),
          nextDueDate: z.date().optional().nullable(),
          status: z.enum(["Active", "Inactive", "Maintenance", "Retired"]).optional(),
          branchId: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        return createEquipment(input as any);
      }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
          data: z.object({
            name: z.string().optional(),
            serialNumber: z.string().optional().nullable(),
            make: z.string().optional().nullable(),
            model: z.string().optional().nullable(),
            description: z.string().optional().nullable(),
            domain: z.string().optional().nullable(),
            calibrationType: z.string().optional().nullable(),
            intervalMonths: z.number().optional().nullable(),
            lastServiceDate: z.date().optional().nullable(),
            nextDueDate: z.date().optional().nullable(),
            status: z.enum(["Active", "Inactive", "Maintenance", "Retired"]).optional(),
            branchId: z.number().optional().nullable(),
          }),
        })
      )
    .mutation(async ({ input }) => {
      const result = await updateEquipment(input.id, input.data);
      if (input.data.nextDueDate) {
        const { resetEquipmentEscalation } = await import("../notifications");
        await resetEquipmentEscalation(input.id);
      }
      const { checkEquipmentCalibrationDue } = await import("../notifications");
      await checkEquipmentCalibrationDue();
      return result;
    }),

  documents: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getEquipmentDocuments(input);
    }),

  addDocument: protectedProcedure
    .input(
      z.object({
        equipmentId: z.number(),
        label: z.string(),
        documentType: z.enum(["Manual", "Certificate", "Specification", "Maintenance Log", "Other"]),
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      return createEquipmentDocument(input as any);
    }),

  loans: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getEquipmentLoans(input);
    }),

  createLoan: protectedProcedure
    .input(
      z.object({
        equipmentId: z.number(),
        fromBranchId: z.number(),
        toBranchId: z.number(),
        loanDate: z.date(),
        expectedReturnDate: z.date().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return createEquipmentLoan({
        ...input,
        notes: input.notes?.trim() || null,
        expectedReturnDate: input.expectedReturnDate ?? null,
      } as any);
    }),

  returnLoan: protectedProcedure
    .input(z.object({ loanId: z.number() }))
    .mutation(async ({ input }) => {
      return returnEquipmentLoan(input.loanId);
    }),

  removeDocument: protectedProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      return deleteEquipmentDocument(input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { equipment } = await import("../../drizzle/schema");
      await db.delete(equipment).where(eq(equipment.id, input.id));
      return { success: true };
    }),

  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nextDueDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await updateEquipment(input.id, {
        nextDueDate: input.nextDueDate,
      });
      const { resetEquipmentEscalation } = await import("../notifications");
      await resetEquipmentEscalation(input.id);
      return result;
    }),
});
