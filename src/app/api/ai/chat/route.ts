import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { assistantReply, smartLeaveDraft } from "@/server/services/ai.service";

const requestSchema = z.object({
  mode: z.enum(["assistant", "summary", "smart-leave"]),
  message: z.string().trim().min(2).max(1200),
  contextPage: z.enum(["overview", "organization", "users", "employees", "attendance", "leave", "payroll", "announcements", "audit", "assistant", "profile"]).optional(),
  filters: z.object({ start: z.iso.date().optional(), end: z.iso.date().optional(), departmentId: z.string().optional() }).optional(),
}).strict();

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    const input = requestSchema.parse(await readJson<unknown>(currentRequest));
    if (input.mode === "smart-leave") {
      return json(await smartLeaveDraft(actor, input.message));
    }
    return json(await assistantReply(actor, { mode: input.mode, message: input.message, filters: input.filters, contextPage: input.contextPage }));
  });
}
