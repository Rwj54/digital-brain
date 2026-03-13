"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthoritySummaryCard from "@/components/authority/AuthoritySummaryCard";
import ProjectInsightsNav from "@/components/projects/ProjectInsightsNav";
import AuthorityTrendCard from "@/components/authority/AuthorityTrendCard";

type AuthorityInputs = Record<string, unknown>;

type AuthorityRow = {
  project_id: string;
  captured_at: string;
  version: string;
  authority_score: number;
  authority_tier: string;
  competitive_strength: number;
  structural_optimization: number;
  momentum_score: number;
  momentum_label: string;
  inputs: AuthorityInputs;
  created_at: string;
};

type ActionItem = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  category: "reviews" | "photos" | "posts" | "categories" | "citations" | "general";
};

type ActionsSuccessResponse = {
  ok: true;
  projectId: string;
  capturedAt: string | null;
  version: string;
  actions: ActionItem[];
  authorityScore?: number | null;
  authorityTier?: string | null;
  momentumScore?: number | null;
  momentumLabel?: string | null;
  profile?: Record<string, unknown>;
  market?: Record<string, unknown>;
};

type ActionsErrorResponse = {
  ok: false;
  error: string;
};

type ActionsResponse = ActionsSuccessResponse | ActionsErrorResponse;

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function priorityClasses(priority: ActionItem["priority"]) {
  if (priority === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (priority === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function ProjectAuthorityPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const [row, setRow] = useState<AuthorityRow | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [actionsVersion, setActionsVersion] = useState<string | null>(null);
  const [actionsCapturedAt, setActionsCapturedAt] = useState<string | null>(null);

  async function requireAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return false;
    }
    return true;
  }

  async function loadLatestAuthority() {
    const { data, error } = await supabase
      .from("project_authority_scores")
      .select(
        "project_id,captured_at,version,authority_score,authority_tier,competitive_strength,structural_optimization,momentum_score,momentum_label,inputs,created_at"
      )
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const first = Array.isArray(data) && data.length > 0 ? (data[0] as AuthorityRow) : null;
    setRow(first);
  }

  async function loadActions() {
    const res = await fetch(`/api/projects/${projectId}/actions`, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });

    const json: ActionsResponse = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.ok ? "Failed to load actions" : json.error);
    }

    setActions(Array.isArray(json.actions) ? json.actions : []);
    setActionsVersion(json.version ?? null);
    setActionsCapturedAt(json.capturedAt ?? null);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setStatus(null);

      const ok = await requireAuth();
      if (!ok) {
        setLoading(false);
        return;
      }

      setAuthed(true);

      try {
        await loadLatestAuthority();
        await loadActions();
      } catch (error: unknown) {
        setStatus(getErrorMessage(error, "Failed to load authority"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">Digital Brain</div>
            <h1 className="truncate text-lg font-semibold md:text-xl">Authority</h1>
            <div className="mt-0.5 truncate text-xs text-gray-500">Project: {projectId}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ProjectInsightsNav projectId={projectId} />

            <button
              onClick={async () => {
                setStatus("Refreshing…");
                try {
                  await loadLatestAuthority();
                  await loadActions();
                  setStatus(null);
                } catch (error: unknown) {
                  setStatus(getErrorMessage(error, "Refresh failed"));
                }
              }}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              type="button"
              disabled={!authed}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {status ? (
        <div className="mx-auto mt-3 max-w-7xl px-4 md:px-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {status}
          </div>
        </div>
      ) : null}

      <div className="mx-auto mt-4 max-w-7xl space-y-4 px-4 pb-10 md:px-6">
        <AuthoritySummaryCard projectId={projectId} />

        <AuthorityTrendCard projectId={projectId} />

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Recommended next actions</div>
              <div className="mt-1 text-xs text-gray-500">
                Action Engine v0 recommendations based on the latest authority inputs.
              </div>
            </div>

            <div className="text-right text-xs text-gray-500">
              <div>Version: {actionsVersion ?? "v0"}</div>
              <div className="mt-1">Captured: {actionsCapturedAt ?? "—"}</div>
            </div>
          </div>

          {!actions.length ? (
            <div className="mt-3 text-sm text-gray-500">No actions available yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {actions.map((action, index) => (
                <div
                  key={`${action.category}-${action.title}-${index}`}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{action.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{action.detail}</div>
                    </div>

                    <div
                      className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium uppercase ${priorityClasses(
                        action.priority
                      )}`}
                    >
                      {action.priority}
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] uppercase tracking-wide text-gray-500">
                    Category: {action.category}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Authority details</div>
          <div className="mt-1 text-xs text-gray-500">
            Read-only inspection for validating the nightly engine.
          </div>

          {!row ? (
            <div className="mt-3 text-sm text-gray-500">No authority row found yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Captured</div>
                <div className="mt-1 text-sm font-semibold">{row.captured_at}</div>
                <div className="mt-1 text-xs text-gray-500">Version: {row.version}</div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Tier</div>
                <div className="mt-1 text-sm font-semibold">{row.authority_tier}</div>
                <div className="mt-1 text-xs text-gray-500">
                  Score: {Number(row.authority_score).toFixed(1)}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Competitive Strength</div>
                <div className="mt-1 text-sm font-semibold">
                  {Number(row.competitive_strength).toFixed(1)}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Structural Optimization</div>
                <div className="mt-1 text-sm font-semibold">
                  {Number(row.structural_optimization).toFixed(1)}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 md:col-span-2">
                <div className="text-xs text-gray-500">Inputs JSON</div>
                <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-[11px] text-gray-800">
                  {formatJson(row.inputs)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}