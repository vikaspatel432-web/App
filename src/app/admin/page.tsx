import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { NewClientOrgForm } from "./new-client-org-form";

export default async function AdminPage() {
  const user = await requireAdmin();

  const clientOrgs = await db.clientOrg.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, projectAccess: true } } },
  });

  return (
    <>
      <TopNav userName={user.name} isAdmin />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold text-white">Clients</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Manage which client organizations exist, who can log in, and which Speckle projects each one can see.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="flex flex-col gap-3">
            {clientOrgs.length === 0 && (
              <li className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
                No clients yet — create one to get started.
              </li>
            )}
            {clientOrgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/admin/clients/${org.id}`}
                  className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 transition hover:border-blue-600"
                >
                  <h2 className="font-medium text-white">{org.name}</h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    {org._count.users} user{org._count.users === 1 ? "" : "s"} ·{" "}
                    {org._count.projectAccess} project{org._count.projectAccess === 1 ? "" : "s"} shared
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <NewClientOrgForm />
        </div>
      </main>
    </>
  );
}
