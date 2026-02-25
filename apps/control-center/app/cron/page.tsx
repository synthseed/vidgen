import { getCronDrilldown } from '@/lib/drilldowns';
import { normalizeRange } from '@/lib/metrics';
import { TopNav } from '@/components/top-nav';
import { BiControls } from '@/components/bi-controls';

export default async function CronPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const range = normalizeRange(typeof params.range === 'string' ? params.range : null);
  const compare = params.compare === 'previous' ? 'previous' : 'off';
  const segment = params.segment === 'healthy' || params.segment === 'attention' ? params.segment : 'all';
  const data = await getCronDrilldown(range);
  const categories = segment === 'healthy' ? data.categories.filter((c) => c.count === 0) : segment === 'attention' ? data.categories.filter((c) => c.count > 0) : data.categories;

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Cron Diagnostics</h1>
          <div className="muted">Integrated reliability KPIs + category trend + incident drilldowns</div>
        </div>
      </div>
      <TopNav current="/cron" />
      <BiControls path="/cron" range={range} compare={compare} segment={segment} />

      <section className="grid">
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Jobs</h3><div className="kpi-value">{data.summary.cronJobs}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Failing now</h3><div className="kpi-value">{data.summary.currentlyFailing}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Peak failing</h3><div className="kpi-value">{data.summary.peakFailing}</div></div>
        <div className="card span-3"><h3 style={{ marginTop: 0 }}>Reliability</h3><div className="kpi-value">{Math.round((data.summary.reliability || 0) * 100)}%</div></div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Failure Categories ({segment})</h3>
          <ul className="list">{categories.map((c) => <li key={c.type}><strong>{c.type}</strong> — {c.count} <span className="muted">({c.note})</span></li>)}</ul>
        </div>
        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Recent Incidents</h3>
          <ul className="list">{data.incidents.length ? data.incidents.map((i) => <li key={`${i.ts}:${i.type}`}>{i.ts} — <strong>{i.severity}</strong> {i.message}</li>) : <li className="muted">No cron incidents in selected window.</li>}</ul>
        </div>
      </section>
    </main>
  );
}
