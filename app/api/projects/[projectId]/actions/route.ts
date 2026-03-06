import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function getProjectIdFromUrl(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("projects");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return "";
}

async function readProjectIdFromContext(context: any): Promise<string> {
  const paramsMaybe = context?.params;
  if (!paramsMaybe) return "";

  try {
    const params =
      typeof (paramsMaybe as any)?.then === "function" ? await paramsMaybe : paramsMaybe;

    const projectId = params?.projectId;
    return typeof projectId === "string" ? projectId.trim() : "";
  } catch {
    return "";
  }
}

type ActionItem = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  category: "reviews" | "photos" | "posts" | "categories" | "citations" | "general";
};

export async function GET(req: NextRequest, context: any) {
  try {
    const paramProjectId = await readProjectIdFromContext(context);
    const projectId = paramProjectId || getProjectIdFromUrl(req);

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "Missing projectId" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data: scoreRows, error: scoreError } = await admin
      .from("project_authority_scores")
      .select(
        "project_id,captured_at,version,authority_score,authority_tier,competitive_strength,structural_optimization,momentum_score,momentum_label,inputs,created_at"
      )
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (scoreError) {
      return NextResponse.json({ ok: false, error: scoreError.message }, { status: 500 });
    }

    const latest = Array.isArray(scoreRows) && scoreRows.length > 0 ? scoreRows[0] : null;

    if (!latest) {
      return NextResponse.json({
        ok: true,
        projectId,
        capturedAt: null,
        version: "v0",
        actions: [],
      });
    }

    const inputs = latest.inputs ?? {};
    const market = inputs.market ?? {};
    const profile = inputs.profile ?? {};

    const reviewGap = Number(market.review_gap_to_top3_median ?? market.reviewGapToTop3Median ?? 0);
    const photoGap = Number(market.photo_gap_to_top3_median ?? market.photoGapToTop3Median ?? 0);
    const postGap = Number(market.post_gap_to_top3_median ?? market.postGapToTop3Median ?? 0);
    const categoryGap = Number(
      market.category_relevance_gap ?? market.categoryRelevanceGap ?? 0
    );
    const citationGap = Number(market.citation_gap ?? market.citationGap ?? 0);

    const actions: ActionItem[] = [];

    if (reviewGap > 0) {
      actions.push({
        title: `Add ${Math.ceil(reviewGap)} reviews`,
        detail: "Close the gap to the Top-3 median review count in your local market.",
        priority: reviewGap >= 10 ? "high" : "medium",
        category: "reviews",
      });
    }

    if (photoGap > 0) {
      actions.push({
        title: `Add ${Math.ceil(photoGap)} photos`,
        detail: "Increase photo volume to better match strong local competitors.",
        priority: photoGap >= 10 ? "medium" : "low",
        category: "photos",
      });
    }

    if (postGap > 0) {
      actions.push({
        title: `Publish ${Math.ceil(postGap)} Google posts`,
        detail: "Close the posting activity gap versus the Top-3 median.",
        priority: postGap >= 4 ? "medium" : "low",
        category: "posts",
      });
    }

    if (categoryGap > 0) {
      actions.push({
        title: "Improve category relevance",
        detail:
          "Review primary and secondary GBP categories to better match the leaders in your market.",
        priority: "high",
        category: "categories",
      });
    }

    if (citationGap > 0) {
      actions.push({
        title: "Build citation consistency",
        detail: "Strengthen NAP consistency and directory coverage to reduce local trust gaps.",
        priority: "medium",
        category: "citations",
      });
    }

    if (actions.length === 0) {
      actions.push({
        title: "Maintain current momentum",
        detail:
          "No obvious structural action gaps were detected from the current authority inputs.",
        priority: "low",
        category: "general",
      });
    }

    const { error: upsertError } = await admin
      .from("project_actions")
      .upsert(
        {
          project_id: projectId,
          captured_at: latest.captured_at,
          version: "v0",
          actions_json: actions,
        },
        {
          onConflict: "project_id,captured_at,version",
        }
      );

    if (upsertError) {
      return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      projectId,
      capturedAt: latest.captured_at,
      version: "v0",
      actions,
      authorityScore: latest.authority_score,
      authorityTier: latest.authority_tier,
      momentumScore: latest.momentum_score,
      momentumLabel: latest.momentum_label,
      profile,
      market,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}