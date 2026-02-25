import { getCronDrilldown } from '@/lib/drilldowns';

export default async function CronPage() {
  const data = await getCronDrilldown('7d');

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Cron Diagnostics</h1>
          <div className="muted">Per-job reliability and failure categories (Phase 2)</div>
        </div>
        <a href="./" className="muted">← Back to overview</a>
      </div>

      <section className="grid">
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Jobs</h3><div>{data.summary.cronJobs}</div></div>
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Failing now</h3><div>{data.summary.currentlyFailing}</div></div>
        <div className="card span-4"><h3 style={{ marginTop: 0 }}>Peak failing (7d)</h3><div>{data.summary.peakFailing}</div></div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Failure Categories</h3>
          <ul className="list">{data.categories.map((c) => <li key={c.type}><strong>{c.type}</strong> — {c.count} <span className="muted">({c.note})</span></li>)}</ul>
        </div>
        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Recent Cron Incidents</h3>
          <ul className="list">{data.incidents.length ? data.incidents.map((i) => <li key={`${i.ts}:${i.type}`}>{i.ts} — <strong>{i.severity}</strong> {i.message}</li>) : <li className="muted">No cron incidents in selected window.</li>}</ul>
        </div>
      </section>
    </main>
  );
}
