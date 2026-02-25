"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function requireAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) router.replace("/login");
  }

  async function loadClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      return;
    }

    setClients(data ?? []);
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const { error } = await supabase.from("clients").insert({
      name,
      notes: notes || null,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setName("");
    setNotes("");
    await loadClients();
  }

  useEffect(() => {
    requireAuth();
    loadClients();
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Clients</h1>

      <form onSubmit={addClient} style={{ marginTop: 20 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          required
          style={{ padding: 10, width: "100%", marginBottom: 10 }}
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          style={{ padding: 10, width: "100%", marginBottom: 10 }}
        />
        <button
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Add client
        </button>
      </form>

      {status && <p style={{ marginTop: 10 }}>{status}</p>}

      <div style={{ marginTop: 30 }}>
        {clients.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontWeight: 900 }}>{c.name}</h2>
            {c.notes && <p>{c.notes}</p>}

            <button
              onClick={() => router.push(`/clients/${c.id}`)}
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #111",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              View projects →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
