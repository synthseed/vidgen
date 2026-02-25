import { getOverview } from '@/lib/overview';
import { normalizeRange } from '@/lib/metrics';
import { TopNav } from '@/components/top-nav';
import { BiControls } from '@/components/bi-controls';

export default async function SkillsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const range = normalizeRange(typeof params.range === 'string' ? params.range : null);
  const compare = params.compare === 'previous' ? 'previous' : 'off';
  const segment = params.segment === 'healthy' || params.segment === 'attention' ? params.segment : 'all';
  const data = await getOverview(range);

  const opportunities = segment === 'healthy'
    ? data.skillOpportunities.filter((o) => o.payoffEstimate === 'low')
    : segment === 'attention'
      ? data.skillOpportunities.filter((o) => o.payoffEstimate !== 'low')
      : data.skillOpportunities;

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Skill Opportunities</h1>
          <div className="muted">Recurring pattern detector with confidence and workflow drilldowns</div>
        </div>
      </div>
      <TopNav current="/skills" />
      <BiControls path="/skills" range={range} compare={compare} segment={segment} />

      <section className="grid">
        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Candidate Skills ({segment})</h3>
          <table className="data-table">
            <thead><tr><th>Title</th><th>Pattern</th><th>Frequency</th><th>Payoff</th><th>Confidence</th></tr></thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.id}><td>{o.title}</td><td><code>{o.pattern}</code></td><td>{o.frequency}</td><td>{o.payoffEstimate}</td><td>{(o.confidence * 100).toFixed(0)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Guided Approval Workflows</h3>
          {data.workflows.map((w) => (
            <details key={w.id} style={{ marginBottom: 10 }}>
              <summary><strong>{w.name}</strong> {w.auditable ? '(auditable)' : ''}</summary>
              <ol className="list">
                {w.steps.map((step) => <li key={`${w.id}:${step.step}`}>{step.title} — {step.detail} <span className="muted">[{step.evidence}]</span></li>)}
              </ol>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
