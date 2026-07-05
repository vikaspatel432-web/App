"use client";

import { useActionState } from "react";
import { createClientOrg } from "./actions";

export function NewClientOrgForm() {
  const [state, action, pending] = useActionState(createClientOrg, undefined);

  return (
    <form
      action={action}
      className="h-fit rounded-lg border border-neutral-800 bg-neutral-900 p-4"
    >
      <h2 className="text-sm font-medium text-neutral-300">New client</h2>
      <input
        name="name"
        placeholder="Client name"
        required
        className="mt-3 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
      {state?.error && <p className="mt-2 text-xs text-red-400">{state.error}</p>}
      {state?.success && <p className="mt-2 text-xs text-emerald-400">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create client"}
      </button>
    </form>
  );
}
