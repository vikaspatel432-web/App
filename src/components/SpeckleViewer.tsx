"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ViewerPanel, type StringProp, type Filtering } from "@/components/ViewerPanel";

type SpeckleViewerProps = {
  /** Full Speckle model URL, e.g. `{server}/projects/{projectId}/models/{modelId}@{versionId}` */
  modelUrl: string;
};

type ToolState = {
  section: boolean;
  measure: boolean;
  ortho: boolean;
  explode: number;
  viewMode: number;
};

// Mirrors @speckle/viewer's ViewMode enum (DEFAULT/SOLID/PEN/ARCTIC/SHADED).
const VIEW_MODES: { label: string; value: number }[] = [
  { label: "Shaded", value: 0 },
  { label: "Pen", value: 2 },
  { label: "Arctic", value: 3 },
  { label: "Solid", value: 1 },
];

const CANONICAL_VIEWS = ["top", "front", "back", "left", "right", "3d"] as const;

/**
 * Full-screen Speckle 3D viewer with camera controls and a tool toolbar,
 * mirroring the native Speckle viewer described in the SP BIM Viewer guide.
 *
 * Note: no auth token is sent from the browser (see src/lib/speckle/client.ts),
 * so this only loads Speckle projects/models set to "Public" / "Anyone with the
 * link". Private projects need a server-side object proxy (see README).
 */
export function SpeckleViewer({ modelUrl }: SpeckleViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Holds the live viewer + extensions so button handlers can reach them.
  const apiRef = useRef<{
    viewer: import("@speckle/viewer").Viewer;
    camera: import("@speckle/viewer").CameraController;
    section?: { enabled: boolean; visible: boolean };
    measure?: { enabled: boolean };
    explode?: { setExplode: (t: number) => void };
    viewModes?: { setViewMode: (m: number) => void };
    filtering?: {
      hideObjects: (ids: string[]) => unknown;
      showObjects: (ids: string[]) => unknown;
      isolateObjects: (ids: string[]) => unknown;
      resetFilters: () => unknown;
      setColorFilter: (prop: unknown) => unknown;
      removeColorFilter: () => unknown;
    };
  } | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolState>({
    section: false,
    measure: false,
    ortho: false,
    explode: 0,
    viewMode: 0,
  });
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [properties, setProperties] = useState<StringProp[]>([]);

  useEffect(() => {
    let disposed = false;
    let viewerInstance: import("@speckle/viewer").Viewer | undefined;

    async function setup() {
      const container = containerRef.current;
      if (!container) return;

      setStatus("loading");
      setErrorMessage(null);
      setSelected(null);
      setProperties([]);

      try {
        const SpeckleViewerModule = await import("@speckle/viewer");
        const {
          Viewer,
          DefaultViewerParams,
          SpeckleLoader,
          CameraController,
          SelectionExtension,
          SectionTool,
          MeasurementsExtension,
          ExplodeExtension,
          ViewModes,
          FilteringExtension,
          ViewerEvent,
          UrlHelper,
        } = SpeckleViewerModule;

        const viewer = new Viewer(container, DefaultViewerParams);
        await viewer.init();
        viewerInstance = viewer;

        const camera = viewer.createExtension(CameraController);

        // Optional extensions — guarded so a failure never blocks model loading.
        const safe = <T,>(make: () => T): T | undefined => {
          try {
            return make();
          } catch (e) {
            console.warn("Speckle extension unavailable", e);
            return undefined;
          }
        };
        const selection = safe(() => viewer.createExtension(SelectionExtension));
        const section = safe(() => viewer.createExtension(SectionTool)) as
          | { enabled: boolean; visible: boolean }
          | undefined;
        const measure = safe(() => viewer.createExtension(MeasurementsExtension)) as
          | { enabled: boolean }
          | undefined;
        const explode = safe(() => viewer.createExtension(ExplodeExtension)) as
          | { setExplode: (t: number) => void }
          | undefined;
        const viewModes = safe(() => viewer.createExtension(ViewModes)) as
          | { setViewMode: (m: number) => void }
          | undefined;
        const filtering = safe(() => viewer.createExtension(FilteringExtension)) as
          | {
              hideObjects: (ids: string[]) => unknown;
              showObjects: (ids: string[]) => unknown;
              isolateObjects: (ids: string[]) => unknown;
              resetFilters: () => unknown;
              setColorFilter: (prop: unknown) => unknown;
              removeColorFilter: () => unknown;
            }
          | undefined;

        apiRef.current = { viewer, camera, section, measure, explode, viewModes, filtering };

        // Surface object selection into the properties panel.
        if (selection) {
          viewer.on(ViewerEvent.ObjectClicked, () => {
            try {
              const objs = (
                selection as unknown as {
                  getSelectedObjects: () => Array<Record<string, unknown>>;
                }
              ).getSelectedObjects();
              setSelected(objs && objs.length ? objs[0] : null);
            } catch {
              setSelected(null);
            }
          });
        }

        if (disposed) {
          viewer.dispose();
          return;
        }

        const resourceUrls = await UrlHelper.getResourceUrls(modelUrl);
        for (const url of resourceUrls) {
          const loader = new SpeckleLoader(viewer.getWorldTree(), url, "");
          await viewer.loadObject(loader, true);
        }

        if (!disposed) setStatus("ready");

        // Load filterable properties for the Model/Filter panel (non-blocking).
        try {
          const props = await viewer.getObjectProperties();
          if (!disposed) {
            setProperties(
              props.filter((p): p is StringProp => p.type === "string" && Array.isArray((p as StringProp).valueGroups)),
            );
          }
        } catch (e) {
          console.warn("Could not load object properties", e);
        }
      } catch (err) {
        console.error("Failed to load Speckle model", err);
        if (!disposed) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Unknown error");
        }
      }
    }

    setup();

    return () => {
      disposed = true;
      apiRef.current = null;
      viewerInstance?.dispose();
    };
  }, [modelUrl]);

  const filtering: Filtering = useMemo(() => {
    const call = (fn: (f: NonNullable<typeof apiRef.current>["filtering"]) => void) => {
      try {
        if (apiRef.current?.filtering) fn(apiRef.current.filtering);
      } catch (e) {
        console.warn(e);
      }
    };
    return {
      hide: (ids) => call((f) => f!.hideObjects(ids)),
      show: (ids) => call((f) => f!.showObjects(ids)),
      isolate: (ids) => call((f) => f!.isolateObjects(ids)),
      reset: () => call((f) => f!.resetFilters()),
      colorBy: (prop) => call((f) => f!.setColorFilter(prop)),
      clearColor: () => call((f) => f!.removeColorFilter()),
    };
  }, []);

  const fitToView = useCallback(() => {
    try {
      apiRef.current?.camera.setCameraView(undefined, true);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const setView = useCallback((view: string) => {
    try {
      apiRef.current?.camera.setCameraView(
        view as unknown as Parameters<
          import("@speckle/viewer").CameraController["setCameraView"]
        >[0],
        true,
      );
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const toggleOrtho = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    setTools((t) => {
      const next = !t.ortho;
      try {
        if (next) api.camera.setOrthoCameraOn();
        else api.camera.setPerspectiveCameraOn();
      } catch (e) {
        console.warn(e);
      }
      return { ...t, ortho: next };
    });
  }, []);

  const toggleSection = useCallback(() => {
    const api = apiRef.current;
    if (!api?.section) return;
    setTools((t) => {
      const next = !t.section;
      try {
        api.section!.enabled = next;
        api.section!.visible = next;
      } catch (e) {
        console.warn(e);
      }
      return { ...t, section: next };
    });
  }, []);

  const toggleMeasure = useCallback(() => {
    const api = apiRef.current;
    if (!api?.measure) return;
    setTools((t) => {
      const next = !t.measure;
      try {
        api.measure!.enabled = next;
      } catch (e) {
        console.warn(e);
      }
      return { ...t, measure: next };
    });
  }, []);

  const setExplode = useCallback((value: number) => {
    const api = apiRef.current;
    setTools((t) => ({ ...t, explode: value }));
    try {
      api?.explode?.setExplode(value);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const setViewMode = useCallback((mode: number) => {
    const api = apiRef.current;
    setTools((t) => ({ ...t, viewMode: mode }));
    try {
      api?.viewModes?.setViewMode(mode);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-950">
      <div ref={containerRef} className="h-full w-full" />

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          Loading model…
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-red-400">
          <p>Couldn&apos;t load this model.</p>
          <p className="max-w-md text-xs text-neutral-500">
            This viewer loads objects anonymously, so the project/model must be set to
            &quot;Public&quot; or &quot;Anyone with the link&quot; in Speckle. {errorMessage}
          </p>
        </div>
      )}

      {status === "ready" && (
        <>
          {/* Camera controls — top right */}
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <div className="flex flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/90 backdrop-blur">
              <ToolbarButton title="Fit to view" onClick={fitToView}>⤢</ToolbarButton>
              <ToolbarButton
                title={tools.ortho ? "Perspective" : "Orthographic"}
                onClick={toggleOrtho}
                active={tools.ortho}
              >
                ▣
              </ToolbarButton>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/90 p-1 backdrop-blur">
              {CANONICAL_VIEWS.map((v) => (
                <button
                  key={v}
                  title={`${v} view`}
                  onClick={() => setView(v)}
                  className="rounded px-2 py-1 text-[10px] uppercase text-neutral-300 hover:bg-neutral-700 hover:text-white"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Model / Filter / Selected panel — left */}
          <ViewerPanel properties={properties} filtering={filtering} selected={selected} />

          {/* Tool toolbar — bottom center */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900/90 px-2 py-1.5 backdrop-blur">
              <ToolbarButton title="Section box" onClick={toggleSection} active={tools.section} round>
                ✂
              </ToolbarButton>
              <ToolbarButton title="Measure" onClick={toggleMeasure} active={tools.measure} round>
                📏
              </ToolbarButton>
              <div className="flex items-center gap-1 px-2" title="Explode model">
                <span className="text-xs text-neutral-500">Explode</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={tools.explode}
                  onChange={(e) => setExplode(Number(e.target.value))}
                  className="h-1 w-20 accent-blue-500"
                />
              </div>
              <div className="mx-1 h-5 w-px bg-neutral-700" />
              {VIEW_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setViewMode(m.value)}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    tools.viewMode === m.value
                      ? "bg-blue-600 text-white"
                      : "text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
  active,
  round,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  round?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center text-sm ${
        round ? "rounded-full" : ""
      } ${active ? "bg-blue-600 text-white" : "text-neutral-300 hover:bg-neutral-700 hover:text-white"}`}
    >
      {children}
    </button>
  );
}
