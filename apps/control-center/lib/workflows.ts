import type { WorkflowSkeleton } from '@/lib/types';

export function getWorkflowSkeletons(): WorkflowSkeleton[] {
  return [
    {
      id: 'cron-failure-triage',
      name: 'Cron Failure Triage',
      auditable: true,
      steps: [
        { step: 1, title: 'Scope failures', detail: 'Open cron drilldown and isolate failing jobs by category and time window.', evidence: 'Capture failing job count and category snapshot.' },
        { step: 2, title: 'Validate dependencies', detail: 'Check connection pairing/auth state before retrying jobs.', evidence: 'Attach connection timeline event IDs.' },
        { step: 3, title: 'Apply contained retry', detail: 'Run one bounded retry cycle and monitor error transitions.', evidence: 'Record command + result in run log.' },
        { step: 4, title: 'Post-incident note', detail: 'Document root cause and preventive guardrail update proposal.', evidence: 'Linked issue/plan entry with owner.' }
      ]
    },
    {
      id: 'connection-recovery',
      name: 'Connection Recovery',
      auditable: true,
      steps: [
        { step: 1, title: 'Detect auth-state degradation', detail: 'Confirm pairing-required signal count and source freshness.', evidence: 'Snapshot `/connections` state and timestamp.' },
        { step: 2, title: 'Re-pair exact target', detail: 'Approve only pending intended device/session request.', evidence: 'Record approved request ID.' },
        { step: 3, title: 'Verify recovery', detail: 'Re-check drilldown API for reduced pairing hints + steady health.', evidence: 'Before/after signal diff.' },
        { step: 4, title: 'Close with audit trail', detail: 'Store remediation steps, actor, and validation checks.', evidence: 'Runbook completion log attached.' }
      ]
    }
  ];
}
