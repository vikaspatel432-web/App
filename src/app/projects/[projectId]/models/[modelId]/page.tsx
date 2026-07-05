import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, assertProjectAccess } from "@/lib/dal";
import { getModelWithVersions, getCommentThreads, SPECKLE_SERVER_URL } from "@/lib/speckle/queries";
import { TopNav } from "@/components/TopNav";
import { SpeckleViewer } from "@/components/SpeckleViewer";

export default async function ModelPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; modelId: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { projectId, modelId } = await params;
  const { v: selectedVersionId } = await searchParams;
  const user = await getCurrentUser();
  await assertProjectAccess(projectId);

  const model = await getModelWithVersions(projectId, modelId);
  if (!model) notFound();

  const activeVersion = selectedVersionId
    ? model.versions.find((version) => version.id === selectedVersionId)
    : model.versions[0];

  const modelUrl = activeVersion
    ? `${SPECKLE_SERVER_URL}/projects/${projectId}/models/${modelId}@${activeVersion.id}`
    : `${SPECKLE_SERVER_URL}/projects/${projectId}/models/${modelId}`;

  const comments = activeVersion ? await getCommentThreads(projectId, modelId) : null;

  return (
    <>
      <TopNav userName={user.name} isAdmin={user.role === "ADMIN"} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-6 py-6">
        <div>
          <Link href={`/projects/${projectId}`} className="text-sm text-neutral-500 hover:text-white">
            ← {model.projectName}
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-white">{model.modelName}</h1>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-h-[480px]">
            <SpeckleViewer modelUrl={modelUrl} />
          </div>

          <aside className="flex flex-col gap-6">
            <section>
              <h2 className="mb-2 text-sm font-medium text-neutral-300">Versions</h2>
              <ul className="flex flex-col gap-1">
                {model.versions.map((version) => (
                  <li key={version.id}>
                    <Link
                      href={`/projects/${projectId}/models/${modelId}?v=${version.id}`}
                      className={`block rounded-md border px-3 py-2 text-xs transition ${
                        version.id === activeVersion?.id
                          ? "border-blue-600 bg-blue-950/40 text-white"
                          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <p className="truncate font-medium">{version.message || "No message"}</p>
                      <p className="mt-0.5 text-neutral-500">
                        {version.authorName ?? "Unknown"} · {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))}
                {model.versions.length === 0 && (
                  <li className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-500">
                    No versions yet.
                  </li>
                )}
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-medium text-neutral-300">Comments</h2>
              {comments === null ? (
                <p className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-500">
                  Comments preview unavailable.
                </p>
              ) : comments.length === 0 ? (
                <p className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-500">
                  No comments yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs"
                    >
                      <p className="text-neutral-200">{comment.rawText}</p>
                      <p className="mt-1 text-neutral-500">
                        {comment.authorName ?? "Unknown"} ·{" "}
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
