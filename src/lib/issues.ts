import "server-only";
import { db } from "@/lib/db";

export type IssueStatus = "OPEN" | "READY_FOR_REVIEW" | "DONE";
export type IssuePriority = "NONE" | "LOW" | "MEDIUM" | "HIGH";

/** Issues for a model, newest first, with author/assignee names and comment counts. */
export async function getIssues(speckleProjectId: string, speckleModelId: string) {
  return db.issue.findMany({
    where: { speckleProjectId, speckleModelId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      objectId: true,
      cameraView: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export type IssueWithDetail = Awaited<ReturnType<typeof getIssues>>[number];

/**
 * Users who may be assigned issues on a project: your team (admins) plus any
 * user whose organization has been granted access to that Speckle project.
 */
export async function getAssignableUsers(speckleProjectId: string) {
  const orgs = await db.projectAccess.findMany({
    where: { speckleProjectId },
    select: { clientOrgId: true },
  });
  const orgIds = orgs.map((o) => o.clientOrgId);

  return db.user.findMany({
    where: {
      OR: [{ role: "ADMIN" }, { clientOrgId: { in: orgIds.length ? orgIds : ["__none__"] } }],
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });
}
