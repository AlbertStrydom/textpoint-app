import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getDb,
  getAllLecturers,
  getLecturerById,
  createLecturer,
  updateLecturer,
  getAllMethods,
  createMethod,
  updateMethod,
} from "../db";

export const lecturersRouter = router({
  list: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllLecturers(input?.branchId);
    }),

  get: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const lecturer = await getLecturerById(input);
      if (!lecturer) throw new TRPCError({ code: "NOT_FOUND" });
      return lecturer;
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().optional().or(z.literal("")).nullish(),
        phone: z.string().optional().nullish(),
        specialization: z.string().optional().nullish(),
        branchId: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return createLecturer(input as any);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")).nullish(),
          phone: z.string().optional().nullish(),
          specialization: z.string().optional().nullish(),
          branchId: z.number().optional().nullable(),
          active: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateLecturer(input.id, input.data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { lecturers } = await import("../../drizzle/schema");
      await db.delete(lecturers).where(eq(lecturers.id, input.id));
      return { success: true };
    }),

  methods: protectedProcedure.query(async () => {
    return getAllMethods();
  }),

  createMethod: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        color: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return createMethod({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        color: input.color?.trim() || null,
      } as any);
    }),

  updateMethod: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string(),
          description: z.string().optional(),
          color: z.string().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateMethod(input.id, {
        name: input.data.name.trim(),
        description: input.data.description?.trim() || null,
        color: input.data.color?.trim() || null,
      } as any);
    }),
});
