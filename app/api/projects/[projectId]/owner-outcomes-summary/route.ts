import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type ProjectRow = {
  monthly_customer_events: number | null;
  review_conversion_rate: number | null;
  event_label_singular: string | null;
  event_label_plural: string | null;
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getServiceRoleSupabase() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

function buildOutcomeReadinessLabel(input: {
  hasMonthlyEvents: boolean;
  hasConversionRate: boolean;
}): string {
  const score =
    (input.hasMonthlyEvents ? 1 : 0) +
    (input.hasConversionRate ? 1 : 0);

  if (score === 2) {
    return "Good early outcomes tracking";
  }

  if (score === 1) {
    return "Partial outcomes tracking";
  }

  return "Very limited outcomes tracking";
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing projectId.",
        },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();

    const { data, error } = await supabase
      .from("projects")
      .select(
        "monthly_customer_events, review_conversion_rate, event_label_singular, event_label_plural",
      )
      .eq("id", projectId)
      .single<ProjectRow>();

    if (error) {
      throw new Error(`Failed to load project outcomes summary: ${error.message}`);
    }

    const hasMonthlyEvents = data.monthly_customer_events !== null;
    const hasConversionRate = data.review_conversion_rate !== null;

    return NextResponse.json({
      ok: true,
      projectId,
      summary: {
        monthlyCustomerEvents: data.monthly_customer_events,
        reviewConversionRate: data.review_conversion_rate,
        eventLabelSingular: data.event_label_singular,
        eventLabelPlural: data.event_label_plural,
        hasMonthlyEvents,
        hasConversionRate,
        outcomesReadinessLabel: buildOutcomeReadinessLabel({
          hasMonthlyEvents,
          hasConversionRate,
        }),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner outcomes summary.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
