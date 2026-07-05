import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, assertProjectAccess } from "@/lib/dal";
import { getModelWithVersions, SPECKLE_SERVER_URL } from "@/lib/speckle/queries";
import { getIssues, getAssignableUsers } from "@/lib/issues";
import { TopNav } from "@/components/TopNav";
import { SpeckleViewer } from "@/components/SpeckleViewer";
import { ModelSidebar } from "@/components/ModelSidebar";

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

  const [issues, users] = await Promise.all([
    getIssues(projectId, modelId),
    getAssignableUsers(projectId),
  ]);

  const activeVersion = selectedVersionId
    ? model.versions.find((version) => version.id === selectedVersionId)
    : model.versions[0];

  const modelUrl = activeVersion
    ? `${SPECKLE_SERVER_URL}/projects/${projectId}/models/${modelId}@${activeVersion.id}`
    : `${SPECKLE_SERVER_URL}/projects/${projectId}/models/${modelId}`;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopNav userName={user.name} isAdmin={user.role === "ADMIN"} />

      <div className="flex items-center gap-3 border-b border-neutral-800 px-6 py-2 text-sm">
        <Link href={`/projects/${projectId}`} className="text-neutral-500 hover:text-white">
          ← {model.projectName}
        </Link>
        <span className="text-neutral-600">/</span>
        <span className="font-medium text-white">{model.modelName}</span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative flex-1">
          <SpeckleViewer modelUrl={modelUrl} />
        </div>

        <ModelSidebar
          projectId={projectId}
          modelId={modelId}
          versions={model.versions.map((v) => ({
            id: v.id,
            message: v.message,
            authorName: v.authorName,
            createdAt: v.createdAt,
          }))}
          activeVersionId={activeVersion?.id}
          issues={issues}
          users={users}
        />
      </div>
    </div>
  );
}
