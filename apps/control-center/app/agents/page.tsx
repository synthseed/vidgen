import { getAgentsDrilldown } from '@/lib/drilldowns';

export default async function AgentsPage() {
  const data = await getAgentsDrilldown('7d');

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Agent Diagnostics</h1>
          <div className="muted">Task volume, reliability, and latency bands (Phase 2)</div>
        </div>
        <a href="./" className="muted">← Back to overview</a>
      </div>

      <section className="grid">
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Active now</h3><div>{data.summary.currentlyActive}</div></div>
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Peak active (7d)</h3><div>{data.summary.peakActiveAgents}</div></div>
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Recommendations</h3><div>{data.summary.recommendationCount}</div></div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Top Agents</h3>
          <ul className="list">{data.summary.topAgents.length ? data.summary.topAgents.map((a) => <li key={a.id}><strong>{a.id}</strong> — {a.sessions} sessions, reliability {(a.reliability * 100).toFixed(0)}%</li>) : <li className="muted">No agents detected.</li>}</ul>
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Latency Bands</h3>
          <ul className="list">{data.latencyBands.map((b) => <li key={b.band}><strong>{b.band}</strong>: {b.score} <span className="muted">— {b.description}</span></li>)}</ul>
        </div>
      </section>
    </main>
  );
}
