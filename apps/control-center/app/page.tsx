import { getOverview } from '@/lib/overview';
import { KpiCard } from '@/components/kpi-card';

function toneFromState(state: string): 'ok' | 'warn' | 'err' {
  if (state === 'ok' || state === 'healthy') return 'ok';
  if (state === 'degraded') return 'warn';
  return 'err';
}

export default async function Page() {
  const data = await getOverview('24h');

  return (
    <main className="main">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>OpenClaw Control Center</h1>
          <div className="muted">Dark operations dashboard (Phase 0)</div>
        </div>
        <div className="muted">Updated {new Date(data.generatedAt).toLocaleString()}</div>
      </div>

      <section className="grid">
        <KpiCard label="Overall Health" value={data.kpis.overallHealth} tone={toneFromState(data.kpis.overallHealth)} />
        <KpiCard label="Cron Jobs" value={data.kpis.cronJobs} tone={toneFromState(data.modules.cron.state)} />
        <KpiCard label="Cron Failing" value={data.kpis.cronFailing} tone={data.kpis.cronFailing > 0 ? 'warn' : 'ok'} />
        <KpiCard label="Recall Flagged" value={data.kpis.recallFlagged} tone={data.kpis.recallFlagged > 0 ? 'warn' : 'ok'} />
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
                  <strong>{agent.id}</strong> — {agent.sessions} session(s)
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card span-12">
          <h3 style={{ marginTop: 0 }}>Source Health</h3>
          <ul className="list">
            {data.sourceHealth.map((source) => (
              <li key={source.source}>
                <strong>{source.source}</strong>: {source.state}
                {source.note ? <span className="muted"> — {source.note.slice(0, 180)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
