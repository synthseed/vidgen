export type SourceState = 'ok' | 'degraded' | 'error';
export type FreshnessState = 'live' | 'stale' | 'outdated' | 'unknown';

export type SourceHealth = {
  source: string;
  state: SourceState;
  note?: string;
  lastSuccessfulAt?: string;
  freshness?: FreshnessState;
};

export type AgentScorecard = {
  id: string;
  reliability: number;
  latencyScore: number;
  retryPressure: number;
  trendDelta: {
    reliability: number;
    latency: number;
    retries: number;
  };
};

export type SkillOpportunity = {
  id: string;
  title: string;
  pattern: string;
  frequency: number;
  payoffEstimate: 'low' | 'medium' | 'high';
  confidence: number;
};

export type WorkflowStep = {
  step: number;
  title: string;
  detail: string;
  evidence: string;
};

export type WorkflowSkeleton = {
  id: 'cron-failure-triage' | 'connection-recovery';
  name: string;
  auditable: boolean;
  steps: WorkflowStep[];
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
    confidence: number;
    priorityScore: number;
    evidence: Array<{ signal: string; href?: string }>;
  }>;
  scorecards: AgentScorecard[];
  skillOpportunities: SkillOpportunity[];
  workflows: WorkflowSkeleton[];
  sourceHealth: SourceHealth[];
};
