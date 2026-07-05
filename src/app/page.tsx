import Link from "next/link";
import { getCurrentUser, getAllowedProjectIds } from "@/lib/dal";
import { getProjectSummaries, getMyProjects } from "@/lib/speckle/queries";
import { TopNav } from "@/components/TopNav";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  let projects;
  try {
    if (user.role === "ADMIN") {
      projects = await getMyProjects();
    } else {
      const allowed = await getAllowedProjectIds();
      const ids = allowed === "ALL" ? [] : allowed;
      projects = await getProjectSummaries(ids);
      // getProjectSummaries silently drops projects it fails to fetch, so an
      // empty result when access mappings exist means Speckle was unreachable,
      // not that nothing has been shared.
      if (ids.length > 0 && projects.length === 0) {
        projects = null;
      }
    }
  } catch (err) {
    console.error("Failed to load projects from Speckle", err);
    projects = null;
  }

  return (
    <>
      <TopNav userName={user.name} isAdmin={user.role === "ADMIN"} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold text-white">Projects</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {user.role === "ADMIN"
            ? "All projects visible to the connected Speckle account."
            : `Projects shared with ${user.clientOrg?.name ?? "your organization"}.`}
        </p>

        {projects === null && (
          <p className="mt-8 rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            Couldn&apos;t reach the Speckle API. Check SPECKLE_SERVER_URL / SPECKLE_TOKEN.
          </p>
        )}

        {projects && projects.length === 0 && (
          <p className="mt-8 rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
            {user.role === "ADMIN"
              ? "No projects found for the connected Speckle account."
              : "No projects have been shared with your organization yet."}
          </p>
        )}

        {projects && projects.length > 0 && (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block rounded-lg border border-neutral-800 bg-neutral-900 p-5 transition hover:border-blue-600"
                >
                  <h2 className="font-medium text-white">{project.name}</h2>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{project.description}</p>
                  )}
                  <p className="mt-3 text-xs text-neutral-500">
                    {project.modelCount} model{project.modelCount === 1 ? "" : "s"} · updated{" "}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
