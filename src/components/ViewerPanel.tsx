"use client";

import { useMemo, useState } from "react";

export type StringProp = {
  key: string;
  type: "string";
  objectCount: number;
  valueGroups: { value: string; ids: string[] }[];
};

export type Filtering = {
  hide: (ids: string[]) => void;
  show: (ids: string[]) => void;
  isolate: (ids: string[]) => void;
  reset: () => void;
  colorBy: (prop: StringProp) => void;
  clearColor: () => void;
};

type Tab = "model" | "filter" | "selected";

// Properties that make good grouping/filtering axes, in preferred order.
const PREFERRED = ["category", "level", "type", "family", "speckle_type"];

export function ViewerPanel({
  properties,
  filtering,
  selected,
}: {
  properties: StringProp[];
  filtering: Filtering;
  selected: Record<string, unknown> | null;
}) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("model");

  const usableProps = useMemo(
    () =>
      [...properties]
        .filter((p) => p.valueGroups && p.valueGroups.length > 1 && p.valueGroups.length < 200)
        .sort((a, b) => rank(a.key) - rank(b.key)),
    [properties],
  );

  const [groupKey, setGroupKey] = useState<string>("");
  const activeProp = useMemo(
    () => usableProps.find((p) => p.key === groupKey) ?? usableProps[0],
    [usableProps, groupKey],
  );

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [coloredBy, setColoredBy] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Show panel"
        className="absolute left-3 top-3 z-10 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-2 text-sm text-neutral-200 backdrop-blur hover:bg-neutral-800"
      >
        ☰
      </button>
    );
  }

  function toggleGroup(value: string, ids: string[]) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
        filtering.show(ids);
      } else {
        next.add(value);
        filtering.hide(ids);
      }
      return next;
    });
  }

  function isolateGroup(ids: string[]) {
    filtering.isolate(ids);
  }

  function resetAll() {
    setHidden(new Set());
    setColoredBy(null);
    filtering.reset();
  }

  return (
    <div className="absolute left-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-72 flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-neutral-800 px-2 py-1.5">
        <div className="flex gap-1">
          <TabButton active={tab === "model"} onClick={() => setTab("model")}>Model</TabButton>
          <TabButton active={tab === "filter"} onClick={() => setTab("filter")}>Filter</TabButton>
          <TabButton active={tab === "selected"} onClick={() => setTab("selected")}>Selected</TabButton>
        </div>
        <button onClick={() => setOpen(false)} title="Hide panel" className="px-1 text-neutral-500 hover:text-white">
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
        {tab === "model" && (
          <ModelTab
            usableProps={usableProps}
            activeProp={activeProp}
            onGroupKeyChange={setGroupKey}
            hidden={hidden}
            onToggle={toggleGroup}
            onIsolate={isolateGroup}
            onReset={resetAll}
          />
        )}

        {tab === "filter" && (
          <FilterTab
            usableProps={usableProps}
            coloredBy={coloredBy}
            onColorBy={(p) => {
              setColoredBy(p.key);
              filtering.colorBy(p);
            }}
            onClear={() => {
              setColoredBy(null);
              filtering.clearColor();
            }}
          />
        )}

        {tab === "selected" &&
          (selected ? (
            <SelectedTab data={selected} />
          ) : (
            <p className="text-neutral-500">Click an object in the model to see its properties.</p>
          ))}
      </div>
    </div>
  );
}

function ModelTab({
  usableProps,
  activeProp,
  onGroupKeyChange,
  hidden,
  onToggle,
  onIsolate,
  onReset,
}: {
  usableProps: StringProp[];
  activeProp: StringProp | undefined;
  onGroupKeyChange: (k: string) => void;
  hidden: Set<string>;
  onToggle: (value: string, ids: string[]) => void;
  onIsolate: (ids: string[]) => void;
  onReset: () => void;
}) {
  if (!activeProp) {
    return <p className="text-neutral-500">No groupable properties in this model.</p>;
  }
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-neutral-500">Group by</span>
        <select
          value={activeProp.key}
          onChange={(e) => onGroupKeyChange(e.target.value)}
          className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
        >
          {usableProps.map((p) => (
            <option key={p.key} value={p.key}>
              {label(p.key)}
            </option>
          ))}
        </select>
        <button onClick={onReset} title="Show all" className="rounded px-1.5 py-1 text-neutral-400 hover:bg-neutral-800 hover:text-white">
          Reset
        </button>
      </div>
      <ul className="flex flex-col gap-0.5">
        {activeProp.valueGroups.map((g) => {
          const isHidden = hidden.has(g.value);
          return (
            <li key={g.value} className="group flex items-center gap-1 rounded px-1 py-1 hover:bg-neutral-800/60">
              <button
                onClick={() => onToggle(g.value, g.ids)}
                title={isHidden ? "Show" : "Hide"}
                className={`w-5 text-center ${isHidden ? "text-neutral-600" : "text-neutral-300"}`}
              >
                {isHidden ? "◌" : "👁"}
              </button>
              <span className={`flex-1 truncate ${isHidden ? "text-neutral-600" : "text-neutral-200"}`} title={g.value}>
                {g.value || "(none)"}
              </span>
              <span className="text-neutral-600">{g.ids.length}</span>
              <button
                onClick={() => onIsolate(g.ids)}
                title="Isolate"
                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white"
              >
                ⊙
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterTab({
  usableProps,
  coloredBy,
  onColorBy,
  onClear,
}: {
  usableProps: StringProp[];
  coloredBy: string | null;
  onColorBy: (p: StringProp) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-neutral-500">Color the model by a property</span>
        {coloredBy && (
          <button onClick={onClear} className="text-neutral-400 hover:text-white">
            Clear
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-1">
        {usableProps.map((p) => (
          <li key={p.key}>
            <button
              onClick={() => onColorBy(p)}
              className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left ${
                coloredBy === p.key
                  ? "border-blue-600 bg-blue-950/40 text-white"
                  : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <span className="truncate">{label(p.key)}</span>
              <span className="text-neutral-600">{p.valueGroups.length}</span>
            </button>
          </li>
        ))}
        {usableProps.length === 0 && <li className="text-neutral-500">No properties to color by.</li>}
      </ul>
    </div>
  );
}

function SelectedTab({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
    .filter(([, v]) => v !== null && typeof v !== "object")
    .slice(0, 60);
  if (entries.length === 0) return <p className="text-neutral-500">No simple properties on this object.</p>;
  return (
    <dl className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-neutral-800 pb-1">
          <dt className="shrink-0 text-neutral-500">{k}</dt>
          <dd className="truncate text-right text-neutral-200" title={String(v)}>
            {String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-1 text-[11px] ${active ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function rank(key: string) {
  const i = PREFERRED.indexOf(key.toLowerCase());
  return i === -1 ? PREFERRED.length + 1 : i;
}

function label(key: string) {
  const short = key.split(".").pop() ?? key;
  return short.charAt(0).toUpperCase() + short.slice(1);
}
