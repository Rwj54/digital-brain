"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type ClientRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  client_id: string;
  site_url: string;
  category: string;
  metro: string;
  radius_miles: number;
  created_at: string;
};

export default function ClientProjectsPage() {
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const [client, setClient] = useState<ClientRow | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [siteUrl, setSiteUrl] = useState("");
  const [category, setCategory] = useState("");
  const [metro, setMetro] = useState("");
  const [radiusMiles, setRadiusMiles] = useState<number>(35);

  async function requireAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) router.replace("/login");
  }

  async function loadClientAndProjects() {
    setStatus(null);

    const { data: clientData, error: clientErr } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientErr) {
      setStatus(clientErr.message);
      return;
    }
    setClient(clientData);

    const { data: projectData, error: projectErr } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (projectErr) {
      setStatus(projectErr.message);
      return;
    }

    setProjects(projectData ?? []);
  }

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const cleanUrl = siteUrl.trim().replace(/\/+$/, "");

    const { error } = await supabase.from("projects").insert({
      client_id: clientId,
      site_url: cleanUrl,
      category: category.trim(),
      metro: metro.trim(),
      radius_miles: radiusMiles,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setSiteUrl("");
    setCategory("");
    setMetro("");
    setRadiusMiles(35);

    await loadClientAndProjects();
  }

  useEffect(() => {
    requireAuth();
    loadClientAndProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <button
        onClick={() => router.push("/clients")}
        style={{
          marginBottom: 14,
          background: "transparent",
          border: "none",
          padding: 0,
          textDecoration: "underline",
          cursor: "pointer",
          opacity: 0.8,
        }}
      >
        ← Back to clients
      </button>

      <h1 style={{ fontSize: 26, fontWeight: 900 }}>
        {client ? client.name : "Client"} — Projects
      </h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Add a project: website + category + metro + radius.
      </p>

      <form onSubmit={addProject} style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="Website URL (ex: https://corumsflowers.com)"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (ex: florist, wedding flowers)"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <input
            value={metro}
            onChange={(e) => setMetro(e.target.value)}
            placeholder="Metro area (ex: Omaha, NE)"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ fontWeight: 700 }}>Radius (miles)</label>
            <input
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              type="number"
              min={1}
              max={200}
              style={{
                width: 120,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
          </div>

          <button
            style={{
              width: 200,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #111",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Add project
          </button>
        </div>
      </form>

      {status && (
        <p style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>{status}</p>
      )}

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Existing projects</h2>
        {projects.length === 0 ? (
          <p style={{ opacity: 0.8, marginTop: 10 }}>No projects yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900 }}>{p.site_url}</div>
                <div style={{ marginTop: 6 }}>
  <b>Category:</b> {p.category} &nbsp; | &nbsp;
  <b>Metro:</b> {p.metro} &nbsp; | &nbsp;
  <b>Radius:</b> {p.radius_miles} mi
</div>

<button
  onClick={() => router.push(`/clients/${clientId}/projects/${p.id}`)}
  style={{
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #111",
    fontWeight: 900,
    cursor: "pointer",
    width: 180,
  }}
>
  Open dashboard →
</button>

<div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
  Created: {new Date(p.created_at).toLocaleString()}
</div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  

                  Created: {new Date(p.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
