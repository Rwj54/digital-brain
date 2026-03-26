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
        <div className="border border-amber-500 bg-amber-100/80">
          <div className="border-b border-amber-500 bg-amber-200 px-5 py-4 sm:px-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-950">
              90-day target
            </div>
            <div className="mt-2 text-sm leading-7 text-slate-800">
              Aim for{" "}
              <span className="font-semibold text-slate-950">
                {realisticTarget90d ?? "—"}
              </span>{" "}
              reviews in 90 days at about{" "}
              <span className="font-semibold text-slate-950">{perWeek ?? "—"}</span>{" "}
              per week.
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-950/80">
              High-conversion playbook
            </div>
            <ol className="mt-4 space-y-3 pl-5 text-sm leading-7 text-[var(--text-body)]">
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

            <div className="mt-5 border-l-2 border-amber-700 pl-4 text-xs leading-6 text-amber-950">
              Next iteration: we’ll generate a weekly schedule and track completion.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}