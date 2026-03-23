import { Card } from "@/components/projects/dashboard/Card";

type ActionsTabProps = {
  realisticTarget90d: number | null;
  perWeek: number | null;
  labelSingular: string;
};

export function ActionsTab({
  realisticTarget90d,
  perWeek,
  labelSingular,
}: ActionsTabProps) {
  return (
    <div className="grid gap-4">
      <Card title="Action plan" subtitle="Capacity-aware weekly plan">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            90-day target
          </div>
          <div className="mt-2 text-sm text-zinc-700">
            Aim for{" "}
            <span className="font-black text-zinc-950">
              {realisticTarget90d ?? "—"}
            </span>{" "}
            reviews in 90 days at about{" "}
            <span className="font-black text-zinc-950">{perWeek ?? "—"}</span>{" "}
            per week.
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
          <div className="text-sm font-extrabold text-zinc-950">
            High-conversion playbook
          </div>
          <ol className="mt-3 space-y-3 pl-5 text-sm text-zinc-700">
            <li>
              Ask at the moment of success, right after the{" "}
              {labelSingular.toLowerCase()} is complete.
            </li>
            <li>Send the review link by SMS within 30 minutes.</li>
            <li>
              Use a two-step ask: “Was everything great?” and only then request
              the review.
            </li>
            <li>Put the review link on invoices, estimates, and email signatures.</li>
            <li>Respond to every review within 48 hours.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Next iteration: we’ll generate a weekly schedule and track completion.
        </div>
      </Card>
    </div>
  );
}
