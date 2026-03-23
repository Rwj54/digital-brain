"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ClientRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const requireAuth = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      router.replace("/login");
      return false;
    }

    return true;
  }, [router]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setClients((data ?? []) as ClientRow[]);
    setLoading(false);
  }, []);

  async function createClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    const normalizedName = name.trim();
    const normalizedNotes = notes.trim();

    if (!normalizedName) {
      setStatus("Client name is required.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: normalizedName,
        notes: normalizedNotes ? normalizedNotes : null,
      })
      .select("id")
      .single();

    if (error) {
      setStatus(error.message);
      setSubmitting(false);
      return;
    }

    setName("");
    setNotes("");
    setSubmitting(false);

    router.push(`/clients/${data.id}`);
  }

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const isAuthed = await requireAuth();

      if (!isAuthed || !isActive) {
        return;
      }

      await loadClients();
    })();

    return () => {
      isActive = false;
    };
  }, [requireAuth, loadClients]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[28px] border border-[var(--border)] bg-white px-6 py-6 shadow-sm">
            <p className="text-base text-[var(--text-body)]">Loading clients...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--text-strong)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        <section className="rounded-[32px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
                Client intake
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[2.15rem] sm:leading-tight">
                Create the client first, then start URL-first onboarding.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                This keeps setup simple. Once the client exists, the next screen
                becomes the project intake surface where Digital Brain starts
                turning a website into an automation-ready local search project.
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--primary-soft)] px-5 py-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-700)]">
                What happens next
              </p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    1) Open client workspace
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
                    Each client gets a dedicated workspace for project intake and
                    dashboards.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    2) Start URL-first project onboarding
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
                    Enter the website first. Digital Brain will infer what it
                    can immediately and store automation-facing identity fields.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    3) Land in the project dashboard
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
                    The user moves directly into a working project instead of a
                    dead-end setup flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {status ? (
          <section className="rounded-[24px] border border-[var(--danger)] bg-[var(--danger-soft)] px-5 py-4 shadow-sm">
            <p className="text-sm font-medium text-[var(--danger)]">{status}</p>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[32px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Create client
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
              Keep this step lightweight.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
              The client page will handle project intake, onboarding kickoff,
              and the move into dashboard review.
            </p>

            <form onSubmit={createClient} className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[var(--text-strong)]">
                  Client name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="JF Evans Lawn & Landscape"
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[var(--text-strong)]">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this client, market, or engagement."
                  className="min-h-[120px] rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              <button
                disabled={submitting}
                className="inline-flex w-fit items-center justify-center rounded-2xl bg-[var(--brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Creating client..." : "Create client"}
              </button>
            </form>
          </section>

          <section className="rounded-[32px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Existing clients
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                  Open a client workspace
                </h2>
              </div>

              <div className="rounded-full bg-[var(--reference-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)]">
                {clients.length} client{clients.length === 1 ? "" : "s"}
              </div>
            </div>

            {clients.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--reference-soft)] px-5 py-5 text-sm text-[var(--text-body)]">
                No clients yet. Create one above to begin.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {clients.map((client) => (
                  <article
                    key={client.id}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--reference-soft)] px-5 py-5"
                  >
                    <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                      {client.name}
                    </h3>

                    <p className="mt-3 min-h-[72px] text-sm leading-7 text-[var(--text-body)]">
                      {client.notes?.trim() ? client.notes : "No notes yet."}
                    </p>

                    <button
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-strong)] shadow-sm ring-1 ring-[var(--border)] transition hover:bg-[var(--brand-50)]"
                    >
                      Open client
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}