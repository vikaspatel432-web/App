"use client";

import Link from "next/link";
import { useState } from "react";
import { IssuesPanel, type IssueDTO, type UserOption } from "@/components/IssuesPanel";

export type VersionDTO = {
  id: string;
  message: string | null;
  authorName: string | null;
  createdAt: string | Date;
};

export function ModelSidebar({
  projectId,
  modelId,
  versions,
  activeVersionId,
  issues,
  users,
}: {
  projectId: string;
  modelId: string;
  versions: VersionDTO[];
  activeVersionId: string | undefined;
  issues: IssueDTO[];
  users: UserOption[];
}) {
  const openCount = issues.filter((i) => i.status !== "DONE").length;
  const [tab, setTab] = useState<"versions" | "issues">("issues");

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-neutral-800 bg-neutral-950">
      <div className="flex border-b border-neutral-800">
        <TabButton active={tab === "issues"} onClick={() => setTab("issues")}>
          Issues{openCount ? ` (${openCount})` : ""}
        </TabButton>
        <TabButton active={tab === "versions"} onClick={() => setTab("versions")}>
          Versions ({versions.length})
        </TabButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "issues" ? (
          <IssuesPanel issues={issues} users={users} projectId={projectId} modelId={modelId} />
        ) : (
          <ul className="flex flex-col gap-1">
            {versions.map((version) => (
              <li key={version.id}>
                <Link
                  href={`/projects/${projectId}/models/${modelId}?v=${version.id}`}
                  className={`block rounded-md border px-3 py-2 text-xs transition ${
                    version.id === activeVersionId
                      ? "border-blue-600 bg-blue-950/40 text-white"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  <p className="truncate font-medium">{version.message || "No message"}</p>
                  <p className="mt-0.5 text-neutral-500">
                    {version.authorName ?? "Unknown"} · {new Date(version.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
            {versions.length === 0 && (
              <li className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-500">
                No versions yet.
              </li>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs font-medium ${
        active ? "border-b-2 border-blue-500 text-white" : "text-neutral-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
