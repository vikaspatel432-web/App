"use client";

import { useActionState } from "react";
import { createClientUser } from "@/app/admin/actions";

export function NewUserForm({ clientOrgId }: { clientOrgId: string }) {
  const [state, action, pending] = useActionState(createClientUser, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:flex-row sm:items-end sm:flex-wrap"
    >
      <input type="hidden" name="clientOrgId" value={clientOrgId} />
      <div className="flex-1 min-w-[140px]">
        <label className="mb-1 block text-xs text-neutral-400">Name</label>
        <input
          name="name"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="mb-1 block text-xs text-neutral-400">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="mb-1 block text-xs text-neutral-400">Temporary password</label>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add user"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-400">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-emerald-400">{state.success}</p>}
    </form>
  );
}
