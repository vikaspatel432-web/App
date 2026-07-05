import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { removeProjectAccess } from "@/app/admin/actions";
import { NewUserForm } from "./new-user-form";
import { NewProjectAccessForm } from "./new-project-access-form";

export default async function ClientOrgPage({
  params,
}: {
  params: Promise<{ clientOrgId: string }>;
}) {
  const { clientOrgId } = await params;
  const admin = await requireAdmin();

  const clientOrg = await db.clientOrg.findUnique({
    where: { id: clientOrgId },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      projectAccess: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!clientOrg) notFound();

  return (
    <>
      <TopNav userName={admin.name} isAdmin />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/admin" className="text-sm text-neutral-500 hover:text-white">
          ← Clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">{clientOrg.name}</h1>

        <section className="mt-8">
          <h2 className="text-sm font-medium text-neutral-300">Shared Speckle projects</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Paste the Speckle project ID (find it in the project URL:
            {" "}<code>/projects/&lt;id&gt;</code>).
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {clientOrg.projectAccess.map((access) => (
              <li
                key={access.id}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-neutral-200">{access.label || access.speckleProjectId}</p>
                  <p className="text-xs text-neutral-500">{access.speckleProjectId}</p>
                </div>
                <form action={removeProjectAccess}>
                  <input type="hidden" name="id" value={access.id} />
                  <input type="hidden" name="clientOrgId" value={clientOrg.id} />
                  <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </form>
              </li>
            ))}
            {clientOrg.projectAccess.length === 0 && (
              <li className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-500">
                No projects shared yet.
              </li>
            )}
          </ul>
          <div className="mt-4">
            <NewProjectAccessForm clientOrgId={clientOrg.id} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium text-neutral-300">Users</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {clientOrg.users.map((u) => (
              <li
                key={u.id}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              >
                {u.name} <span className="text-neutral-500">· {u.email}</span>
              </li>
            ))}
            {clientOrg.users.length === 0 && (
              <li className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-500">
                No users yet.
              </li>
            )}
          </ul>
          <div className="mt-4">
            <NewUserForm clientOrgId={clientOrg.id} />
          </div>
        </section>
      </main>
    </>
  );
}
