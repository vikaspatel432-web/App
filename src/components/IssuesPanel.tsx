"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createIssue,
  updateIssueStatus,
  updateIssueFields,
  addIssueComment,
  type IssueActionState,
} from "@/app/actions/issues";

type Person = { id: string; name: string } | null;
export type IssueDTO = {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "READY_FOR_REVIEW" | "DONE";
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | Date | null;
  objectId: string | null;
  createdAt: string | Date;
  createdBy: NonNullable<Person>;
  assignee: Person;
  comments: {
    id: string;
    body: string;
    createdAt: string | Date;
    author: NonNullable<Person>;
  }[];
};
export type UserOption = { id: string; name: string; role: "ADMIN" | "CLIENT" };

const STATUSES = [
  { key: "OPEN", label: "Open", dot: "bg-amber-400" },
  { key: "READY_FOR_REVIEW", label: "Ready for Review", dot: "bg-blue-400" },
  { key: "DONE", label: "Done", dot: "bg-emerald-400" },
] as const;

const PRIORITIES = [
  { key: "NONE", label: "No priority", color: "text-neutral-500" },
  { key: "LOW", label: "Low", color: "text-neutral-300" },
  { key: "MEDIUM", label: "Medium", color: "text-amber-400" },
  { key: "HIGH", label: "High", color: "text-red-400" },
] as const;

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString();
}
function isOverdue(d: string | Date | null, status: string) {
  return d && status !== "DONE" && new Date(d).getTime() < Date.now();
}

export function IssuesPanel({
  issues,
  users,
  projectId,
  modelId,
}: {
  issues: IssueDTO[];
  users: UserOption[];
  projectId: string;
  modelId: string;
}) {
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const open = issues.filter((i) => i.status !== "DONE").length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">
          Issues <span className="text-neutral-600">({open} open)</span>
        </h2>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500"
        >
          {creating ? "Cancel" : "+ New"}
        </button>
      </div>

      {creating && (
        <NewIssueForm
          projectId={projectId}
          modelId={modelId}
          users={users}
          onDone={() => setCreating(false)}
        />
      )}

      <ul className="mt-2 flex flex-col gap-2">
        {issues.length === 0 && !creating && (
          <li className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-500">
            No issues yet. Click <span className="text-neutral-300">+ New</span> to raise one.
          </li>
        )}
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            users={users}
            expanded={expanded === issue.id}
            onToggle={() => setExpanded((e) => (e === issue.id ? null : issue.id))}
          />
        ))}
      </ul>
    </div>
  );
}

function NewIssueForm({
  projectId,
  modelId,
  users,
  onDone,
}: {
  projectId: string;
  modelId: string;
  users: UserOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<IssueActionState, FormData>(createIssue, undefined);
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <input type="hidden" name="speckleProjectId" value={projectId} />
      <input type="hidden" name="speckleModelId" value={modelId} />
      <input
        name="title"
        placeholder="Issue title"
        required
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
      />
      <textarea
        name="description"
        placeholder="Description (optional)"
        rows={3}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <select name="priority" defaultValue="NONE" className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200">
          {PRIORITIES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <input type="date" name="dueDate" className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200" />
      </div>
      <select name="assigneeId" defaultValue="" className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200">
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}{u.role === "ADMIN" ? " (team)" : ""}
          </option>
        ))}
      </select>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create issue"}
      </button>
    </form>
  );
}

function IssueCard({
  issue,
  users,
  expanded,
  onToggle,
}: {
  issue: IssueDTO;
  users: UserOption[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = STATUSES.find((s) => s.key === issue.status)!;
  const priority = PRIORITIES.find((p) => p.key === issue.priority)!;
  const overdue = isOverdue(issue.dueDate, issue.status);

  return (
    <li className="rounded-md border border-neutral-800 bg-neutral-900 text-xs">
      <button onClick={onToggle} className="flex w-full flex-col gap-1 px-3 py-2 text-left">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} title={status.label} />
          <span className="flex-1 truncate font-medium text-neutral-100">{issue.title}</span>
          {issue.priority !== "NONE" && (
            <span className={`shrink-0 ${priority.color}`}>{priority.label}</span>
          )}
        </div>
        <div className="flex items-center gap-2 pl-4 text-neutral-500">
          <span>{issue.assignee ? issue.assignee.name : "Unassigned"}</span>
          {issue.dueDate && (
            <span className={overdue ? "text-red-400" : ""}>· due {fmtDate(issue.dueDate)}</span>
          )}
          {issue.comments.length > 0 && <span>· 💬 {issue.comments.length}</span>}
          {issue.objectId && <span title="Pinned to an object">· 📌</span>}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-800 px-3 py-2">
          {issue.description && <p className="mb-2 whitespace-pre-wrap text-neutral-300">{issue.description}</p>}

          {/* Status */}
          <div className="mb-2 flex flex-wrap gap-1">
            {STATUSES.map((s) => (
              <form key={s.key} action={updateIssueStatus}>
                <input type="hidden" name="id" value={issue.id} />
                <input type="hidden" name="status" value={s.key} />
                <button
                  type="submit"
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    issue.status === s.key ? "bg-neutral-700 text-white" : "text-neutral-400 hover:bg-neutral-800"
                  }`}
                >
                  {s.label}
                </button>
              </form>
            ))}
          </div>

          {/* Assignee / priority / due */}
          <FieldsForm issue={issue} users={users} />

          {/* Comments */}
          <div className="mt-3">
            <ul className="flex flex-col gap-1.5">
              {issue.comments.map((c) => (
                <li key={c.id} className="rounded bg-neutral-950 px-2 py-1.5">
                  <p className="text-neutral-200">{c.body}</p>
                  <p className="mt-0.5 text-neutral-600">
                    {c.author.name} · {new Date(c.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
            <CommentForm issueId={issue.id} />
          </div>

          <p className="mt-2 text-neutral-600">
            Raised by {issue.createdBy.name} · {new Date(issue.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </li>
  );
}

function FieldsForm({ issue, users }: { issue: IssueDTO; users: UserOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  return (
    <form ref={formRef} action={updateIssueFields} className="grid grid-cols-1 gap-2">
      <input type="hidden" name="id" value={issue.id} />
      <div className="grid grid-cols-2 gap-2">
        <select
          name="priority"
          defaultValue={issue.priority}
          onChange={submit}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-200"
        >
          {PRIORITIES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <input
          type="date"
          name="dueDate"
          defaultValue={issue.dueDate ? new Date(issue.dueDate).toISOString().slice(0, 10) : ""}
          onChange={submit}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-200"
        />
      </div>
      <select
        name="assigneeId"
        defaultValue={issue.assignee?.id ?? ""}
        onChange={submit}
        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-200"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}{u.role === "ADMIN" ? " (team)" : ""}
          </option>
        ))}
      </select>
    </form>
  );
}

function CommentForm({ issueId }: { issueId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await addIssueComment(fd);
        formRef.current?.reset();
      }}
      className="mt-2 flex gap-1"
    >
      <input type="hidden" name="id" value={issueId} />
      <input
        name="body"
        placeholder="Add a comment…"
        required
        className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] text-white outline-none focus:border-blue-500"
      />
      <button type="submit" className="rounded bg-neutral-700 px-2 text-[11px] text-white hover:bg-neutral-600">
        Send
      </button>
    </form>
  );
}
