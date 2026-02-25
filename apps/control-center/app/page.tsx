import { getOverview } from '@/lib/overview';
import { normalizeRange, normalizeResolution, readMetricHistory } from '@/lib/metrics';
import { KpiCard } from '@/components/kpi-card';
import { MetricsChart } from '@/components/metrics-chart';
import { readWeeklySummaryArtifact } from '@/lib/weekly-summary';
import { TopNav } from '@/components/top-nav';
import { BiControls } from '@/components/bi-controls';

function toneFromState(state: string): 'ok' | 'warn' | 'err' {
  if (state === 'ok' || state === 'healthy') return 'ok';
  if (state === 'degraded') return 'warn';
  return 'err';
}

function segmentMatches(segment: string, state: string) {
  if (segment === 'healthy') return state === 'ok';
  if (segment === 'attention') return state !== 'ok';
  return true;
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const range = normalizeRange(typeof params.range === 'string' ? params.range : null);
  const compare = params.compare === 'previous' ? 'previous' : 'off';
  const segment = params.segment === 'healthy' || params.segment === 'attention' ? params.segment : 'all';
  const resolution = normalizeResolution(null, range);

  const [data, metrics, weeklySummary] = await Promise.all([
    getOverview(range),
    readMetricHistory({ range, resolution }),
    readWeeklySummaryArtifact()
  ]);

  const sourceRows = data.sourceHealth.filter((s) => segmentMatches(segment, s.state));

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>OpenClaw Control Center</h1>
          <div className="muted">BI operations overview with KPI + trend + drilldown in one flow</div>
        </div>
        <div className="muted">Updated {new Date(data.generatedAt).toLocaleString()}</div>
      </div>

      <TopNav current="/" />
      <BiControls path="/" range={range} compare={compare} segment={segment} />

      <section className="grid">
        <KpiCard label="Overall Health" value={data.kpis.overallHealth} tone={toneFromState(data.kpis.overallHealth)} freshness={data.freshness} />
        <KpiCard label="Cron Jobs" value={data.kpis.cronJobs} tone={toneFromState(data.modules.cron.state)} />
        <KpiCard label="Cron Failing" value={data.kpis.cronFailing} tone={data.kpis.cronFailing > 0 ? 'warn' : 'ok'} />
        <KpiCard label="Ingest Lag (min)" value={data.kpis.ingestLagMinutes ?? 'n/a'} tone={(data.kpis.ingestLagMinutes || 0) > 30 ? 'warn' : 'ok'} />

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Operational Trend ({range})</h3>
          {metrics.points.length === 0 ? <div className="muted">No ingested history yet.</div> : <MetricsChart points={metrics.points} />}
          <div className="muted">Source: {metrics.source}, samples: {metrics.sampleCount}, compare: {compare}</div>
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Optimization Highlights</h3>
          <ul className="list">
            {data.recommendations.slice(0, 4).map((rec) => (
              <li key={rec.id}><strong>{rec.title}</strong> — {rec.impact} (score {rec.priorityScore})</li>
            ))}
          </ul>
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Skill Opportunities</h3>
          <ul className="list">
            {data.skillOpportunities.slice(0, 4).map((op) => (
              <li key={op.id}><strong>{op.title}</strong> — freq {op.frequency}, conf {(op.confidence * 100).toFixed(0)}%</li>
            ))}
          </ul>
        </div>

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Source Drilldown ({segment})</h3>
          <table className="data-table">
            <thead><tr><th>Source</th><th>State</th><th>Freshness</th><th>Notes</th></tr></thead>
            <tbody>
              {sourceRows.map((source) => (
                <tr key={source.source}><td>{source.source}</td><td>{source.state}</td><td>{source.freshness || 'unknown'}</td><td>{source.note || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Weekly Summary</h3>
          <div className="muted">{weeklySummary ? `Latest: ${new Date(weeklySummary.generatedAt).toLocaleString()}` : 'No weekly summary yet.'}</div>
        </div>
      </section>
    </main>
  );
}
