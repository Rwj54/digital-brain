import { Card } from "@/components/projects/dashboard/Card";

type ActionsTabProps = {
  realisticTarget90d: number | null;
  perWeek: number | null;
  labelSingular: string;
};

type PlaybookStep = {
  title: string;
  body: string;
};

function PlanStep({
  index,
  step,
}: {
  index: number;
  step: PlaybookStep;
}) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="grid gap-3 sm:grid-cols-[28px_minmax(0,1fr)] sm:items-start">
        <div className="text-sm font-semibold text-[var(--brand-700)]">
          {index}.
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-strong)]">
            {step.title}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
            {step.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ActionsTab({
  realisticTarget90d,
  perWeek,
  labelSingular,
}: ActionsTabProps) {
  const steps: PlaybookStep[] = [
    {
      title: "Ask right after the win",
      body: `Ask at the moment of success, right after the ${labelSingular.toLowerCase()} is complete.`,
    },
    {
      title: "Send the link quickly",
      body: "Send the review link by SMS within 30 minutes.",
    },
    {
      title: "Use a two-step ask",
      body: "Ask whether everything went great first, and only then request the review.",
    },
    {
      title: "Put the link everywhere it belongs",
      body: "Add the review link to invoices, estimates, and email signatures.",
    },
    {
      title: "Respond fast",
      body: "Reply to every review within 48 hours so the profile stays active and trustworthy.",
    },
  ];

  return (
    <div className="grid gap-4">
      <Card title="Action plan" subtitle="Capacity-aware weekly plan">
        <div className="grid gap-6">
          <section className="border border-[var(--border)] bg-[var(--warning-soft)] px-5 py-5 sm:px-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--warning)]">
              90-day target
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-strong)]">
              Aim for {realisticTarget90d ?? "—"} reviews in the next 90 days.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
              That works out to about{" "}
              <span className="font-semibold text-[var(--text-strong)]">
                {perWeek ?? "—"}
              </span>{" "}
              per week at the current realistic pace.
            </p>
          </section>

          <section
            className="border border-[var(--border)] px-5 py-5 sm:px-6"
            style={{ backgroundColor: "rgba(245, 158, 11, 0.06)" }}
          >
            <div className="border-b border-[var(--border)] pb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--warning)]">
                High-conversion playbook
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                Keep the plan simple. These are the highest-leverage habits for
                turning more happy customers into more reviews.
              </p>
            </div>

            <div className="pt-4">
              {steps.map((step, index) => (
                <PlanStep key={step.title} index={index + 1} step={step} />
              ))}
            </div>
          </section>

          <section className="border-l-2 border-[var(--warning)] pl-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--warning)]">
              Next iteration
            </div>
            <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
              The next version of this tab should turn the playbook into a weekly
              schedule and track whether the team is actually completing it.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}