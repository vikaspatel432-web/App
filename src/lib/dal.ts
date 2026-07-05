import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "@/lib/session";
import { db } from "@/lib/db";

export const verifySession = cache(async () => {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);

  if (!session?.userId) {
    redirect("/login");
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      clientOrgId: true,
      clientOrg: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
});

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}

/** Project IDs (Speckle) the current user's client org is allowed to see. Admins bypass this check entirely. */
export const getAllowedProjectIds = cache(async (): Promise<string[] | "ALL"> => {
  const user = await getCurrentUser();
  if (user.role === "ADMIN") return "ALL";
  if (!user.clientOrgId) return [];

  const access = await db.projectAccess.findMany({
    where: { clientOrgId: user.clientOrgId },
    select: { speckleProjectId: true },
  });
  return access.map((a) => a.speckleProjectId);
});

export async function assertProjectAccess(projectId: string) {
  const allowed = await getAllowedProjectIds();
  if (allowed === "ALL") return;
  if (!allowed.includes(projectId)) {
    redirect("/");
  }
}
