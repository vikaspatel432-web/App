import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, assertProjectAccess } from "@/lib/dal";
import { getProjectWithModels } from "@/lib/speckle/queries";
import { TopNav } from "@/components/TopNav";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  await assertProjectAccess(projectId);

  const project = await getProjectWithModels(projectId);
  if (!project) notFound();

  return (
    <>
      <TopNav userName={user.name} isAdmin={user.role === "ADMIN"} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Link href="/" className="text-sm text-neutral-500 hover:text-white">
          ← All projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">{project.name}</h1>
        {project.description && <p className="mt-1 text-sm text-neutral-400">{project.description}</p>}

        {project.models.items.length === 0 ? (
          <p className="mt-8 rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
            No models in this project yet.
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.models.items.map((model) => (
              <li key={model.id}>
                <Link
                  href={`/projects/${project.id}/models/${model.id}`}
                  className="block rounded-lg border border-neutral-800 bg-neutral-900 p-5 transition hover:border-blue-600"
                >
                  <h2 className="font-medium text-white">{model.name}</h2>
                  <p className="mt-3 text-xs text-neutral-500">
                    updated {new Date(model.updatedAt).toLocaleDateString()}
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
