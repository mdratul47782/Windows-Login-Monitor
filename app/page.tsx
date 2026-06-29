"use client";

import { useEffect, useState, useCallback } from "react";

type LoginAlert = {
  id: string;
  pcName: string;
  userName: string;
  failCount: number;
  timestamp: string;
  receivedAt: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<LoginAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const data = await res.json();
      setAlerts(data.alerts || []);
      setLastFetch(new Date());
    } catch {
      // On network error, the next poll will retry automatically
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleClear = async () => {
    if (!confirm("Clear all alerts?")) return;
    await fetch("/api/alerts", { method: "DELETE" });
    fetchAlerts();
  };

  // Unique PCs that sent an alert in the last 24 hours
  const last24h = alerts.filter(
    (a) => Date.now() - new Date(a.receivedAt).getTime() < 24 * 60 * 60 * 1000
  );
  const uniquePcs = new Set(last24h.map((a) => a.pcName)).size;

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px" }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
          Login monitoring dashboard
        </h1>
        <p style={{ fontSize: 14, color: "#6b6b68", marginTop: 6 }}>
          Alerts for 3 or more consecutive failed password attempts on factory PCs
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard label="Total alerts" value={alerts.length} />
        <StatCard label="Last 24 hours" value={last24h.length} />
        <StatCard label="Affected PCs (24h)" value={uniquePcs} />
      </section>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13, color: "#888780" }}>
          {lastFetch
            ? `Last updated: ${lastFetch.toLocaleTimeString("en-US")}`
            : "Loading..."}
        </span>
        <button
          onClick={handleClear}
          style={{
            fontSize: 13,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #d3d1c7",
            background: "transparent",
            cursor: "pointer",
            color: "#444441",
          }}
        >
          Clear all
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888780", fontSize: 14 }}>Loading...</p>
      ) : alerts.length === 0 ? (
        <div
          style={{
            border: "1px solid #d3d1c7",
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            color: "#888780",
          }}
        >
          No alerts yet. If any PC gets 3 failed password attempts, it will show up here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid #d3d1c7",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function AlertRow({ alert }: { alert: LoginAlert }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid #f7c1c1",
        background: "#fcebeb",
        borderRadius: 12,
        padding: "12px 16px",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#791f1f" }}>
          {alert.pcName} — {alert.userName}
        </div>
        <div style={{ fontSize: 12, color: "#a32d2d", marginTop: 2 }}>
          {alert.failCount} failed attempts · {formatTime(alert.timestamp)}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#a32d2d", whiteSpace: "nowrap" }}>
        {timeAgo(alert.receivedAt)}
      </div>
    </div>
  );
}