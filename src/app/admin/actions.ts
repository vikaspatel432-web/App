"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const ClientOrgSchema = z.object({
  name: z.string().min(2),
});

export type ActionState = { error?: string; success?: string } | undefined;

export async function createClientOrg(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = ClientOrgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "Enter a client name." };

  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await db.clientOrg.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  await db.clientOrg.create({ data: { name: parsed.data.name, slug } });
  revalidatePath("/admin");
  return { success: "Client created." };
}

const UserSchema = z.object({
  clientOrgId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function createClientUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = UserSchema.safeParse({
    clientOrgId: formData.get("clientOrgId"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return { error: "A user with that email already exists." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: "CLIENT",
      clientOrgId: parsed.data.clientOrgId,
    },
  });

  revalidatePath(`/admin/clients/${parsed.data.clientOrgId}`);
  return { success: "User created." };
}

const ProjectAccessSchema = z.object({
  clientOrgId: z.string().min(1),
  speckleProjectId: z.string().min(1),
  label: z.string().optional(),
});

export async function addProjectAccess(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = ProjectAccessSchema.safeParse({
    clientOrgId: formData.get("clientOrgId"),
    speckleProjectId: formData.get("speckleProjectId"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) return { error: "Enter a Speckle project ID." };

  const existing = await db.projectAccess.findUnique({
    where: {
      clientOrgId_speckleProjectId: {
        clientOrgId: parsed.data.clientOrgId,
        speckleProjectId: parsed.data.speckleProjectId,
      },
    },
  });
  if (existing) return { error: "That project is already shared with this client." };

  await db.projectAccess.create({
    data: {
      clientOrgId: parsed.data.clientOrgId,
      speckleProjectId: parsed.data.speckleProjectId,
      label: parsed.data.label,
    },
  });

  revalidatePath(`/admin/clients/${parsed.data.clientOrgId}`);
  return { success: "Project shared." };
}

export async function removeProjectAccess(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const clientOrgId = formData.get("clientOrgId");
  if (typeof id !== "string" || typeof clientOrgId !== "string") return;

  await db.projectAccess.delete({ where: { id } });
  revalidatePath(`/admin/clients/${clientOrgId}`);
}
