import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[var(--border)] py-6 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-black tracking-[-0.01em] text-[var(--text-strong)]">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm leading-6 text-[var(--text-body)]">
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}
