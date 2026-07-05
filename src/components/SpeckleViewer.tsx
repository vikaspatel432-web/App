"use client";

import { useEffect, useRef, useState } from "react";

type SpeckleViewerProps = {
  /** Full Speckle model URL, e.g. `{server}/projects/{projectId}/models/{modelId}@{versionId}` */
  modelUrl: string;
};

/**
 * Loads a Speckle model into an embedded 3D viewer.
 *
 * Note: no auth token is sent from the browser (see src/lib/speckle/client.ts
 * for why the service token must stay server-side), so this only works for
 * Speckle projects/models with "Public" or "Anyone with the link" visibility.
 * Private projects will fail to load here until a server-side object-loading
 * proxy is added (see README "Known limitations").
 */
export function SpeckleViewer({ modelUrl }: SpeckleViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let viewerInstance: import("@speckle/viewer").Viewer | undefined;

    async function setup() {
      const container = containerRef.current;
      if (!container) return;

      setStatus("loading");
      setErrorMessage(null);

      try {
        const { Viewer, DefaultViewerParams, SpeckleLoader, CameraController, UrlHelper } =
          await import("@speckle/viewer");

        const viewer = new Viewer(container, DefaultViewerParams);
        await viewer.init();
        viewer.createExtension(CameraController);
        viewerInstance = viewer;

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
      viewerInstance?.dispose();
    };
  }, [modelUrl]);

  return (
    <div className="relative h-full w-full min-h-[480px] rounded-lg border border-neutral-800 bg-neutral-950">
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          Loading model…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-red-400">
          <p>Couldn&apos;t load this model.</p>
          <p className="text-xs text-neutral-500">
            This viewer loads objects anonymously, so the project/model must be set to
            &quot;Public&quot; or &quot;Anyone with the link&quot; in Speckle. {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
