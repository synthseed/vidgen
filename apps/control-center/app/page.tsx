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
          <div className="muted">Operations dashboard (Phase 1.1+)</div>
        </div>
        <div className="muted">Updated {new Date(data.generatedAt).toLocaleString()}</div>
      </div>

      <section className="grid">
        <KpiCard label="Overall Health" value={data.kpis.overallHealth} tone={toneFromState(data.kpis.overallHealth)} freshness={data.freshness} />
        <KpiCard label="Cron Jobs" value={data.kpis.cronJobs} tone={toneFromState(data.modules.cron.state)} />
        <KpiCard label="Cron Failing" value={data.kpis.cronFailing} tone={data.kpis.cronFailing > 0 ? 'warn' : 'ok'} />
        <KpiCard label="Ingest Lag (min)" value={data.kpis.ingestLagMinutes ?? 'n/a'} tone={(data.kpis.ingestLagMinutes || 0) > 30 ? 'warn' : 'ok'} />
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <strong>Phase 2 Drilldowns:</strong>{' '}
        <a href="./cron">Cron</a> · <a href="./agents">Agents</a> · <a href="./connections">Connections</a>
      </section>

      <section className="grid" style={{ marginTop: 14 }}>
        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Dream Cycle</h3>
          <div>{data.modules.dreamCycle.summary}</div>
          <div className="muted" style={{ marginTop: 8 }}>
            Recommendation: {data.modules.memory.recommendation || 'unknown'}
          </div>
        </div>

        <div className="card span-6">
          <h3 style={{ marginTop: 0 }}>Agent Usage (Top Active)</h3>
          <ul className="list">
            {data.modules.agentUsage.topAgents.length === 0 ? (
              <li className="muted">No session activity detected.</li>
            ) : (
              data.modules.agentUsage.topAgents.map((agent) => (
                <li key={agent.id}>
                  <strong>{agent.id}</strong> — {agent.sessions} session(s), reliability {(agent.reliability * 100).toFixed(0)}%
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Operational Trend</h3>
          {metrics.points.length === 0 ? <div className="muted">No ingested history yet.</div> : <MetricsChart points={metrics.points} />}
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
          <h3 style={{ marginTop: 0 }}>Optimization Insights</h3>
          <ul className="list">
            {data.recommendations.length === 0 ? (
              <li className="muted">No recommendations yet.</li>
            ) : (
              data.recommendations.map((rec) => (
                <li key={rec.id}>
                  <strong>{rec.title}</strong> ({rec.impact}, conf {Math.round(rec.confidence * 100)}%)
                  <div className="muted">{rec.evidence.join(' • ')}</div>
                </li>
              ))
            )}
          </ul>
          <div className="muted" style={{ marginTop: 8 }}>
            Weekly summary API: <code>/api/weekly-summary</code>{' '}
            <a href="./api/weekly-summary?refresh=1">(refresh now)</a>
          </div>
          {weeklySummary ? (
            <div className="muted" style={{ marginTop: 6 }}>
              Latest summary: {new Date(weeklySummary.generatedAt).toLocaleString()} ({weeklySummary.prioritizedActions?.length || 0} prioritized actions)
            </div>
          ) : null}
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
