import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllKPITemplates,
  getKPITemplateById,
  createKPITemplate,
  updateKPITemplate,
  getKPIQuestionsByTemplate,
  createKPIQuestion,
  updateKPIQuestion,
  deleteKPIQuestion,
  getAllKPIRecords,
  getKPIRecordById,
  getKPIAnswersByRecord,
  createKPIRecord,
  updateKPIRecord,
  upsertKPIAnswer,
  deleteKPIRecord,
} from "../db";

export const kpiRouter = router({
  templates: protectedProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllKPITemplates(input?.branchId);
    }),

  getTemplate: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const template = await getKPITemplateById(input);
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      return template;
    }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        branchId: z.number().optional().nullable(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createKPITemplate({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        branchId: input.branchId ?? null,
        active: input.active ?? true,
      } as any);
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          branchId: z.number().optional().nullable(),
          active: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateKPITemplate(input.id, {
        name: input.data.name === undefined ? undefined : input.data.name.trim(),
        description:
          input.data.description === undefined
            ? undefined
            : input.data.description.trim() || null,
        branchId:
          input.data.branchId === undefined ? undefined : input.data.branchId,
        active: input.data.active,
      } as any);
    }),

  questions: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getKPIQuestionsByTemplate(input);
    }),

  addQuestion: protectedProcedure
    .input(
      z.object({
        kpiTemplateId: z.number(),
        questionText: z.string(),
        questionType: z.enum(["Text", "MultipleChoice", "Rating", "YesNo"]),
        options: z.array(z.string()).optional(),
        isRequired: z.boolean().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { options, ...rest } = input;
      return createKPIQuestion({
        ...rest,
        options: options ? { options } : null,
      } as any);
    }),

  updateQuestion: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          questionText: z.string().optional(),
          questionType: z.enum(["Text", "MultipleChoice", "Rating", "YesNo"]).optional(),
          options: z.array(z.string()).optional(),
          isRequired: z.boolean().optional(),
          displayOrder: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const { options, ...rest } = input.data;
      return updateKPIQuestion(input.id, {
        ...rest,
        questionText:
          rest.questionText === undefined ? undefined : rest.questionText.trim(),
        options:
          options === undefined ? undefined : options.length ? { options } : null,
      } as any);
    }),

  deleteQuestion: protectedProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      return deleteKPIQuestion(input);
    }),

  records: protectedProcedure.query(async () => {
    return getAllKPIRecords();
  }),

  getRecord: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const record = await getKPIRecordById(input);
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });
      const questions = await getKPIQuestionsByTemplate(record.kpiTemplateId);
      const answers = await getKPIAnswersByRecord(input);
      return { ...record, questions, answers };
    }),

  createRecord: protectedProcedure
    .input(
      z.object({
        kpiTemplateId: z.number(),
        lecturerId: z.number().optional(),
        courseScheduleId: z.number().optional(),
        evaluationDate: z.date(),
        notes: z.string().optional().nullable(),
        status: z.enum(["Draft", "Submitted", "Approved", "Rejected"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createKPIRecord({
        ...input,
        notes: input.notes?.trim() || null,
        status: input.status ?? "Draft",
      } as any);
    }),

  updateRecord: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          status: z.enum(["Draft", "Submitted", "Approved", "Rejected"]).optional(),
          notes: z.string().optional().nullable(),
          evaluationDate: z.date().optional(),
          lecturerId: z.number().optional().nullable(),
          courseScheduleId: z.number().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const result = await updateKPIRecord(input.id, {
        status: input.data.status,
        notes:
          input.data.notes === undefined
            ? undefined
            : input.data.notes?.trim() || null,
        evaluationDate: input.data.evaluationDate,
        lecturerId:
          input.data.lecturerId === undefined ? undefined : input.data.lecturerId,
        courseScheduleId:
          input.data.courseScheduleId === undefined
            ? undefined
            : input.data.courseScheduleId,
      } as any);
      if (input.data.status === "Submitted") {
        const { checkKPIApprovalsNeeded } = await import("../notifications");
        await checkKPIApprovalsNeeded();
      }
      return result;
    }),

  answers: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getKPIAnswersByRecord(input);
    }),

  addAnswer: protectedProcedure
    .input(
      z.object({
        kpiRecordId: z.number(),
        kpiQuestionId: z.number(),
        answerText: z.string().optional().nullable(),
        answerValue: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return upsertKPIAnswer({
        kpiRecordId: input.kpiRecordId,
        kpiQuestionId: input.kpiQuestionId,
        answerText: input.answerText ?? null,
        answerValue: input.answerValue ?? null,
      } as any);
    }),

  deleteRecord: protectedProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      return deleteKPIRecord(input);
    }),
});
