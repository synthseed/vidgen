import { getOverview } from '@/lib/overview';
import { readMetricHistory } from '@/lib/metrics';
import { KpiCard } from '@/components/kpi-card';
import { MetricsChart } from '@/components/metrics-chart';
import { readWeeklySummaryArtifact } from '@/lib/weekly-summary';

function toneFromState(state: string): 'ok' | 'warn' | 'err' {
  if (state === 'ok' || state === 'healthy') return 'ok';
  if (state === 'degraded') return 'warn';
  return 'err';
}

export default async function Page() {
  const [data, metrics, weeklySummary] = await Promise.all([
    getOverview('24h'),
    readMetricHistory({ range: '24h', resolution: '5m' }),
    readWeeklySummaryArtifact()
  ]);

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>OpenClaw Control Center</h1>
          <div className="muted">Operations dashboard (Phase 3/4 prep)</div>
        </div>
        <div className="muted">Updated {new Date(data.generatedAt).toLocaleString()}</div>
      </div>

      <section className="chip-row">
        <a href="./" className="chip-link">Overview</a>
        <a href="./cron" className="chip-link">Cron</a>
        <a href="./agents" className="chip-link">Agents</a>
        <a href="./connections" className="chip-link">Connections</a>
      </section>

      <section className="grid">
        <KpiCard label="Overall Health" value={data.kpis.overallHealth} tone={toneFromState(data.kpis.overallHealth)} freshness={data.freshness} />
        <KpiCard label="Cron Jobs" value={data.kpis.cronJobs} tone={toneFromState(data.modules.cron.state)} />
        <KpiCard label="Cron Failing" value={data.kpis.cronFailing} tone={data.kpis.cronFailing > 0 ? 'warn' : 'ok'} />
        <KpiCard label="Ingest Lag (min)" value={data.kpis.ingestLagMinutes ?? 'n/a'} tone={(data.kpis.ingestLagMinutes || 0) > 30 ? 'warn' : 'ok'} />
      </section>

      <section className="grid" style={{ marginTop: 14 }}>
        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Operational Trend</h3>
          {metrics.points.length === 0 ? <div className="muted">No ingested history yet.</div> : <MetricsChart points={metrics.points} />}
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Optimization Engine v2</h3>
          <ul className="list">
            {data.recommendations.length === 0 ? (
              <li className="muted">No recommendations yet.</li>
            ) : (
              data.recommendations.map((rec) => (
                <li key={rec.id}>
                  <strong>{rec.title}</strong> ({rec.impact}, conf {Math.round(rec.confidence * 100)}%, score {rec.priorityScore})
                  <div className="muted">
                    {rec.evidence.map((e, idx) => (
                      <span key={`${rec.id}:${idx}`}>
                        {idx > 0 ? ' • ' : ''}
                        {e.href ? <a href={e.href}>{e.signal}</a> : e.signal}
                      </span>
                    ))}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Agent Performance Scorecards</h3>
          <ul className="list">
            {data.scorecards.length === 0 ? <li className="muted">No scorecards yet.</li> : data.scorecards.map((s) => (
              <li key={s.id}>
                <strong>{s.id}</strong> — reliability {(s.reliability * 100).toFixed(0)}%, latency {(s.latencyScore * 100).toFixed(0)}%, retry pressure {(s.retryPressure * 100).toFixed(0)}%
                <div className="muted">Δ rel {s.trendDelta.reliability}, Δ latency {s.trendDelta.latency}, Δ retries {s.trendDelta.retries}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Skill Opportunity Detector (Phase 4 start)</h3>
          <ul className="list">
            {data.skillOpportunities.length === 0 ? <li className="muted">No recurring patterns detected.</li> : data.skillOpportunities.map((op) => (
              <li key={op.id}>
                <strong>{op.title}</strong> — pattern <code>{op.pattern}</code>, freq {op.frequency}, payoff {op.payoffEstimate}, conf {(op.confidence * 100).toFixed(0)}%
              </li>
            ))}
          </ul>
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Guided Workflow Skeletons (Phase 5 prep)</h3>
          <ul className="list">
            {data.workflows.map((w) => (
              <li key={w.id}>
                <strong>{w.name}</strong> {w.auditable ? '(auditable)' : ''}
                <div className="muted">{w.steps.length} run steps defined</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Workflow Steps</h3>
          {data.workflows.map((w) => (
            <div key={w.id} style={{ marginBottom: 10 }}>
              <strong>{w.name}</strong>
              <ol className="list" style={{ marginTop: 4 }}>
                {w.steps.map((step) => (
                  <li key={`${w.id}:${step.step}`}>{step.title} — {step.detail} <span className="muted">[{step.evidence}]</span></li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Incident Timeline</h3>
          <ul className="list">
            {data.incidentTimeline.length === 0 ? (
              <li className="muted">No active incidents detected.</li>
            ) : (
              data.incidentTimeline.map((incident) => (
                <li key={`${incident.ts}:${incident.type}`}>
                  <strong>{incident.severity}</strong> [{incident.source}] {incident.type} — {incident.message}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Weekly Summary</h3>
          <div className="muted">API: <code>/api/weekly-summary</code> <a href="./api/weekly-summary?refresh=1">(refresh now)</a></div>
          {weeklySummary ? <div className="muted" style={{ marginTop: 6 }}>Latest: {new Date(weeklySummary.generatedAt).toLocaleString()} ({weeklySummary.prioritizedActions?.length || 0} actions)</div> : null}
        </div>

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Source Health</h3>
          <ul className="list">
            {data.sourceHealth.map((source) => (
              <li key={source.source}>
                <strong>{source.source}</strong>: {source.state}
                {source.freshness ? <span className="muted"> ({source.freshness})</span> : null}
                {source.note ? <span className="muted"> — {source.note.slice(0, 180)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
