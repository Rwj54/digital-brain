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
        <div className="text-sm text-zinc-800">
          Target: <span className="font-black">{realisticTarget90d ?? "—"}</span> reviews in 90 days (~{" "}
          <span className="font-black">{perWeek ?? "—"}</span>/week).
        </div>

        <div className="mt-4">
          <div className="text-sm font-extrabold text-zinc-900">High-conversion playbook</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-800">
            <li>
              Ask at the “moment of success” (right after the {labelSingular.toLowerCase()} is complete).
            </li>
            <li>Send the review link by SMS within 30 minutes.</li>
            <li>Use a two-step ask: “Was everything great?” → if yes, request review.</li>
            <li>Put the review link on invoices, estimates, email signatures.</li>
            <li>Respond to every review within 48 hours.</li>
          </ol>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          Next iteration: we’ll generate a weekly schedule and track completion.
        </div>
      </Card>
    </div>
  );
}