"use client";
import { useState, useEffect } from "react";

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion?: string;
  latestVersion?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  releaseName?: string;
}

interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onDismiss: () => void;
}

type UpdateState = "idle" | "downloading" | "installing" | "error";

export function UpdateNotification({ updateInfo, onDismiss }: UpdateNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In web, updates are handled by Vercel deployments, so this component is essentially disabled
  }, []);

  if (!updateInfo.hasUpdate) return null;

  const handleUpdateNow = async () => {
      // Reload on web
      window.location.reload();
  };

  const isUpdating = updateState === "downloading" || updateState === "installing";

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isUpdating ? "bg-blue-500 animate-pulse" : "bg-green-500"}`} />
            <span className="text-sm font-medium text-white">
              {isUpdating ? "Updating..." : "Update Available"}
            </span>
          </div>
          {!isUpdating && (
            <button
              onClick={onDismiss}
              className="text-[#999999] hover:text-white transition-colors p-1"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Version info */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#999999] text-sm">
              v{updateInfo.currentVersion}
            </span>
            <span className="text-[#999999]">→</span>
            <span className="text-green-400 font-medium text-sm">
              v{updateInfo.latestVersion}
            </span>
          </div>

          {/* Progress bar (when updating) */}
          {isUpdating && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-[#999999] mb-1">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {updateState === "error" && error && (
            <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Release name */}
          {!isUpdating && updateInfo.releaseName && (
            <h3 className="text-white font-medium mb-2">
              {updateInfo.releaseName}
            </h3>
          )}

          {/* Expandable release notes */}
          {!isUpdating && updateInfo.releaseNotes && (
            <div className="mb-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-[#007acc] hover:text-[#1a9fff] flex items-center gap-1"
              >
                {isExpanded ? "Hide" : "Show"} release notes
                <svg
                  className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExpanded && (
                <div className="mt-2 p-2 bg-[#1e1e1e] rounded text-xs text-[#cccccc] max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans">
                    {updateInfo.releaseNotes}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {updateState === "error" ? (
              <>
                <button
                  onClick={handleUpdateNow}
                  className="flex-1 bg-[#007acc] hover:bg-[#1a9fff] text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-sm text-[#999999] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : isUpdating ? (
              <div className="flex-1 text-center text-sm text-[#999999] py-2">
                {updateState === "installing" ? "Restarting after install..." : "Please wait..."}
              </div>
            ) : (
              <>
                <button
                  onClick={handleUpdateNow}
                  className="flex-1 bg-[#007acc] hover:bg-[#1a9fff] text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                >
                  Update Now
                </button>
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-sm text-[#999999] hover:text-white transition-colors"
                >
                  Later
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
