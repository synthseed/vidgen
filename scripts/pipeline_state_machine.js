const { validateRunEnvelope, validateArtifact } = require("./pipeline_contracts");

const STAGES = [
  "trend_intake",
  "topic_ranking",
  "script_composition",
  "continuity_review",
  "render",
  "qa_gate",
  "publish",
  "feedback"
];

function nowIso() {
  return new Date().toISOString();
}

function clone(input) {
  return JSON.parse(JSON.stringify(input));
}

function emptyStageStates() {
  const states = {};
  for (const stage of STAGES) {
    states[stage] = { status: "pending", updatedAt: null };
  }
  return states;
}

function createRunState(runEnvelope) {
  const envelopeResult = validateRunEnvelope(runEnvelope);
  if (!envelopeResult.ok) {
    throw new Error(`Invalid RunEnvelope: ${envelopeResult.errors.join("; ")}`);
  }

  const states = emptyStageStates();
  states[STAGES[0]].status = "in_progress";
  states[STAGES[0]].updatedAt = nowIso();

  return {
    runEnvelope: clone(runEnvelope),
    status: "running",
    currentStage: STAGES[0],
    stageIndex: 0,
    stageStates: states,
    artifacts: {},
    opsLog: {
      entries: [
        {
          at: nowIso(),
          type: "run_started",
          stage: STAGES[0]
        }
      ]
    },
    appliedTransitions: []
  };
}

function assertRunning(state) {
  if (state.status !== "running") {
    throw new Error(`Run is not active (status=${state.status})`);
  }
}

function assertExpectedStage(state, stage) {
  if (stage !== state.currentStage) {
    throw new Error(`Expected stage "${state.currentStage}", got "${stage}"`);
  }
}

function assertUniqueTransition(state, transitionId) {
  if (!transitionId) return;
  if (state.appliedTransitions.includes(transitionId)) {
    throw new Error(`Duplicate transition id: ${transitionId}`);
  }
}

function markStage(state, stage, status) {
  state.stageStates[stage].status = status;
  state.stageStates[stage].updatedAt = nowIso();
}

function recordLog(state, type, detail) {
  state.opsLog.entries.push({
    at: nowIso(),
    type,
    ...detail
  });
}

function advanceToNextStage(state) {
  if (state.stageIndex === STAGES.length - 1) {
    state.status = "completed";
    state.currentStage = null;
    recordLog(state, "run_completed", {});
    return;
  }

  state.stageIndex += 1;
  state.currentStage = STAGES[state.stageIndex];
  markStage(state, state.currentStage, "in_progress");
  recordLog(state, "stage_started", { stage: state.currentStage });
}

function applyTransition(currentState, transition) {
  const state = clone(currentState);
  const input = transition || {};

  assertRunning(state);
  assertExpectedStage(state, input.stage);
  assertUniqueTransition(state, input.transitionId);

  if (input.transitionId) {
    state.appliedTransitions.push(input.transitionId);
  }

  if (input.decision !== "pass" && input.decision !== "needs_fixes" && input.decision !== "halt") {
    throw new Error('Transition.decision must be "pass", "needs_fixes", or "halt"');
  }

  if (input.decision === "pass") {
    const artifactResult = validateArtifact(input.stage, input.artifact);
    if (!artifactResult.ok) {
      throw new Error(`Invalid artifact for stage "${input.stage}": ${artifactResult.errors.join("; ")}`);
    }

    state.artifacts[input.stage] = clone(input.artifact);
    markStage(state, input.stage, "completed");
    recordLog(state, "stage_completed", { stage: input.stage });
    advanceToNextStage(state);
    return state;
  }

  if (input.decision === "needs_fixes") {
    markStage(state, input.stage, "needs_fixes");
    recordLog(state, "stage_needs_fixes", {
      stage: input.stage,
      reason: input.reason || "unspecified"
    });
    return state;
  }

  markStage(state, input.stage, "failed");
  state.status = "halted";
  recordLog(state, "run_halted", {
    stage: input.stage,
    reason: input.reason || "unspecified"
  });
  return state;
}

module.exports = {
  STAGES,
  createRunState,
  applyTransition
};

