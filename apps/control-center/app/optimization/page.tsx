import { getOverview } from '@/lib/overview';
import { normalizeRange } from '@/lib/metrics';
import { TopNav } from '@/components/top-nav';
import { BiControls } from '@/components/bi-controls';

export default async function OptimizationPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const range = normalizeRange(typeof params.range === 'string' ? params.range : null);
  const compare = params.compare === 'previous' ? 'previous' : 'off';
  const segment = params.segment === 'healthy' || params.segment === 'attention' ? params.segment : 'all';
  const data = await getOverview(range);

  const recommendations = segment === 'healthy'
    ? data.recommendations.filter((r) => r.impact === 'low')
    : segment === 'attention'
      ? data.recommendations.filter((r) => r.impact !== 'low')
      : data.recommendations;

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Optimization Intelligence</h1>
          <div className="muted">Prioritized recommendations + agent scorecard drilldowns</div>
        </div>
      </div>
      <TopNav current="/optimization" />
      <BiControls path="/optimization" range={range} compare={compare} segment={segment} />

      <section className="grid">
        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Recommendations ({segment})</h3>
          <table className="data-table">
            <thead><tr><th>Recommendation</th><th>Impact</th><th>Confidence</th><th>Priority</th><th>Evidence</th></tr></thead>
            <tbody>
              {recommendations.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.impact}</td>
                  <td>{Math.round(r.confidence * 100)}%</td>
                  <td>{r.priorityScore}</td>
                  <td>{r.evidence.map((e) => e.signal).join(' • ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Agent Scorecards</h3>
          <table className="data-table">
            <thead><tr><th>Agent</th><th>Reliability</th><th>Latency score</th><th>Retry pressure</th><th>Trend delta</th></tr></thead>
            <tbody>
              {data.scorecards.map((s) => (
                <tr key={s.id}><td>{s.id}</td><td>{(s.reliability * 100).toFixed(0)}%</td><td>{(s.latencyScore * 100).toFixed(0)}%</td><td>{(s.retryPressure * 100).toFixed(0)}%</td><td>rel {s.trendDelta.reliability}, lat {s.trendDelta.latency}, retry {s.trendDelta.retries}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
