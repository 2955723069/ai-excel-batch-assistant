import { z } from "zod";

export const createJobFormSchema = z.object({
  templateId: z.literal("sales-lead"),
  conversationColumn: z.string().trim().min(1, "请选择包含客户聊天记录的列。"),
  customerIdColumn: z.string().trim().optional().transform((value) => value || null),
  customerNameColumn: z.string().trim().optional().transform((value) => value || null),
});
