import { getAgentsDrilldown } from '@/lib/drilldowns';
import { normalizeRange } from '@/lib/metrics';
import { TopNav } from '@/components/top-nav';
import { BiControls } from '@/components/bi-controls';

export default async function AgentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const range = normalizeRange(typeof params.range === 'string' ? params.range : null);
  const compare = params.compare === 'previous' ? 'previous' : 'off';
  const segment = params.segment === 'healthy' || params.segment === 'attention' ? params.segment : 'all';
  const data = await getAgentsDrilldown(range);

  const topAgents = segment === 'healthy'
    ? data.summary.topAgents.filter((a) => a.reliability >= 0.9)
    : segment === 'attention'
      ? data.summary.topAgents.filter((a) => a.reliability < 0.9)
      : data.summary.topAgents;

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Agent Diagnostics</h1>
          <div className="muted">Interactive workload, reliability, and latency proxy analysis</div>
        </div>
      </div>
      <TopNav current="/agents" />
      <BiControls path="/agents" range={range} compare={compare} segment={segment} />

      <section className="grid">
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Active now</h3><div className="kpi-value">{data.summary.currentlyActive}</div></div>
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Peak active</h3><div className="kpi-value">{data.summary.peakActiveAgents}</div></div>
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Recommendations</h3><div className="kpi-value">{data.summary.recommendationCount}</div></div>

        <div className="card span-8">
          <h3 style={{ marginTop: 0 }}>Top Agents ({segment})</h3>
          <table className="data-table">
            <thead><tr><th>Agent</th><th>Sessions</th><th>Reliability</th></tr></thead>
            <tbody>{topAgents.map((a) => <tr key={a.id}><td>{a.id}</td><td>{a.sessions}</td><td>{(a.reliability * 100).toFixed(0)}%</td></tr>)}</tbody>
          </table>
        </div>

        <div className="card span-4">
          <h3 style={{ marginTop: 0 }}>Latency Bands</h3>
          <ul className="list">{data.latencyBands.map((b) => <li key={b.band}><strong>{b.band}</strong>: {b.score} <span className="muted">{b.description}</span></li>)}</ul>
        </div>
      </section>
    </main>
  );
}
