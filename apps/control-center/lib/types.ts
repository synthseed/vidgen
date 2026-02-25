export type SourceState = 'ok' | 'degraded' | 'error';
export type FreshnessState = 'live' | 'stale' | 'outdated' | 'unknown';

export type SourceHealth = {
  source: string;
  state: SourceState;
  note?: string;
  lastSuccessfulAt?: string;
  freshness?: FreshnessState;
};

export type OverviewPayload = {
  generatedAt: string;
  range: string;
  fallbackUsed: boolean;
  freshness: FreshnessState;
  kpis: {
    overallHealth: string;
    cronJobs: number;
    cronFailing: number;
    recallFlagged: number;
    dreamRuns7d: number;
    activeAgents: number;
    ingestLagMinutes: number | null;
  };
  modules: {
    cron: {
      state: SourceState;
      summary: string;
      diagnostics: {
        failingJobs: number;
        reliability: number | null;
      };
    };
    memory: { state: SourceState; summary: string; recommendation?: string };
    dreamCycle: { state: SourceState; summary: string; latestOk?: boolean };
    agentUsage: {
      state: SourceState;
      summary: string;
      topAgents: Array<{ id: string; sessions: number; reliability: number }>;
    };
    connection: {
      state: SourceState;
      summary: string;
      pairingRequiredHints: number;
    };
  };
  incidentTimeline: Array<{
    ts: string;
    severity: 'info' | 'warn' | 'critical';
    source: string;
    type: string;
    message: string;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    impact: 'low' | 'medium' | 'high';
    evidence: string[];
    confidence: number;
  }>;
  sourceHealth: SourceHealth[];
};
