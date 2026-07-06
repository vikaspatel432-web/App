"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, getAllowedProjectIds } from "@/lib/dal";

async function assertCanAccessProject(speckleProjectId: string) {
  const user = await getCurrentUser();
  const allowed = await getAllowedProjectIds();
  if (allowed !== "ALL" && !allowed.includes(speckleProjectId)) {
    throw new Error("Not authorized for this project");
  }
  return user;
}

/** Confirms the current user may act on an issue (must be able to access its project). */
async function assertCanAccessIssue(issueId: string) {
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    select: { speckleProjectId: true, speckleModelId: true },
  });
  if (!issue) throw new Error("Issue not found");
  const user = await assertCanAccessProject(issue.speckleProjectId);
  return { issue, user };
}

function revalidateModel(projectId: string, modelId: string) {
  revalidatePath(`/projects/${projectId}/models/${modelId}`);
}

const CreateIssueSchema = z.object({
  speckleProjectId: z.string().min(1),
  speckleModelId: z.string().min(1),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]).default("NONE"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  objectId: z.string().optional(),
  cameraView: z.string().optional(),
});

export type IssueActionState = { error?: string; success?: string } | undefined;

export async function createIssue(
  _prev: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  const parsed = CreateIssueSchema.safeParse({
    speckleProjectId: formData.get("speckleProjectId"),
    speckleModelId: formData.get("speckleModelId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority") || "NONE",
    assigneeId: formData.get("assigneeId") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    objectId: formData.get("objectId") || undefined,
    cameraView: formData.get("cameraView") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid issue" };
  }

  const user = await assertCanAccessProject(parsed.data.speckleProjectId);
  const d = parsed.data;

  await db.issue.create({
    data: {
      speckleProjectId: d.speckleProjectId,
      speckleModelId: d.speckleModelId,
      title: d.title,
      description: d.description,
      priority: d.priority,
      assigneeId: d.assigneeId || null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      objectId: d.objectId || null,
      cameraView: d.cameraView || null,
      createdById: user.id,
    },
  });

  revalidateModel(d.speckleProjectId, d.speckleModelId);
  return { success: "Issue created" };
}

export async function updateIssueStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["OPEN", "READY_FOR_REVIEW", "DONE"].includes(status)) return;
  const { issue } = await assertCanAccessIssue(id);
  await db.issue.update({ where: { id }, data: { status: status as never } });
  revalidateModel(issue.speckleProjectId, issue.speckleModelId);
}

export async function updateIssueFields(formData: FormData) {
  const id = String(formData.get("id"));
  const { issue } = await assertCanAccessIssue(id);
  const priority = formData.get("priority");
  const assigneeId = formData.get("assigneeId");
  const dueDate = formData.get("dueDate");

  await db.issue.update({
    where: { id },
    data: {
      ...(priority ? { priority: String(priority) as never } : {}),
      ...(assigneeId !== null ? { assigneeId: assigneeId ? String(assigneeId) : null } : {}),
      ...(dueDate !== null ? { dueDate: dueDate ? new Date(String(dueDate)) : null } : {}),
    },
  });
  revalidateModel(issue.speckleProjectId, issue.speckleModelId);
}

export async function addIssueComment(formData: FormData) {
  const id = String(formData.get("id"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  const { issue, user } = await assertCanAccessIssue(id);
  await db.issueComment.create({ data: { issueId: id, authorId: user.id, body } });
  revalidateModel(issue.speckleProjectId, issue.speckleModelId);
}
