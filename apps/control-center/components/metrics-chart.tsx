"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type Point = {
  ts: string;
  cronFailing: number;
  recallFlagged: number;
  dreamRuns7d: number;
  activeAgents: number;
};

export function MetricsChart({ points }: { points: Point[] }) {
  const rows = points.map((p) => ({ ...p, t: new Date(p.ts).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }));

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="t" stroke="#94a3b8" minTickGap={24} />
          <YAxis stroke="#94a3b8" allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
          <Line type="monotone" dataKey="cronFailing" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cron Failing" />
          <Line type="monotone" dataKey="recallFlagged" stroke="#ef4444" strokeWidth={2} dot={false} name="Recall Flagged" />
          <Line type="monotone" dataKey="activeAgents" stroke="#22c55e" strokeWidth={2} dot={false} name="Active Agents" />
          <Line type="monotone" dataKey="dreamRuns7d" stroke="#60a5fa" strokeWidth={2} dot={false} name="Dream Runs 7d" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
