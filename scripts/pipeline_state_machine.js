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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
    gateEvidence: {},
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

function assertStageCompleted(state, stage) {
  const stageState = state.stageStates[stage];
  if (!stageState || stageState.status !== "completed") {
    throw new Error(`Stage "${stage}" must be completed before "${state.currentStage}"`);
  }
}

function assertContinuityPass(state) {
  const report = state.artifacts.continuity_review;
  if (!report || report.decision !== "pass") {
    throw new Error('Continuity gate failed: continuity_review must return artifact.decision "pass"');
  }
}

function assertPrerequisites(state, stage) {
  switch (stage) {
    case "topic_ranking":
      assertStageCompleted(state, "trend_intake");
      break;
    case "script_composition":
      assertStageCompleted(state, "topic_ranking");
      break;
    case "continuity_review":
      assertStageCompleted(state, "script_composition");
      break;
    case "render":
      assertStageCompleted(state, "continuity_review");
      assertContinuityPass(state);
      break;
    case "qa_gate":
      assertStageCompleted(state, "render");
      break;
    case "publish":
      assertStageCompleted(state, "qa_gate");
      assertContinuityPass(state);
      break;
    case "feedback":
      assertStageCompleted(state, "publish");
      break;
    default:
      break;
  }
}

function assertScriptGate(artifact) {
  const scenes = Array.isArray(artifact.scenes) ? artifact.scenes : [];
  const assetPlan = Array.isArray(artifact.assetPlan) ? artifact.assetPlan : [];

  const sceneIds = [];
  for (const scene of scenes) {
    if (!scene || !isNonEmptyString(scene.id)) {
      throw new Error("Script gate failed: each scene must include an id");
    }
    if (!isNonEmptyString(scene.objective)) {
      throw new Error(`Script gate failed: scene "${scene.id}" must include a non-empty objective`);
    }
    sceneIds.push(scene.id);
  }

  const sceneScopedAssets = new Set();
  let hasUnscopedAssets = false;
  for (const asset of assetPlan) {
    if (asset && isNonEmptyString(asset.sceneId)) {
      sceneScopedAssets.add(asset.sceneId);
    } else {
      hasUnscopedAssets = true;
    }
  }

  for (const sceneId of sceneIds) {
    if (sceneScopedAssets.has(sceneId)) continue;
    if (sceneIds.length === 1 && hasUnscopedAssets) continue;
    throw new Error(`Script gate failed: scene "${sceneId}" is missing supporting assets`);
  }
}

function hasBlockingContinuityFindings(report) {
  const findings = Array.isArray(report.findings) ? report.findings : [];
  return findings.some((finding) => {
    if (!finding || typeof finding !== "object") return false;
    const severity = String(finding.severity || "").toLowerCase();
    const unresolved = finding.resolved !== true;
    return unresolved && (finding.requiredFix === true || severity === "high" || severity === "critical");
  });
}

function assertPublishGateInput(input) {
  const gates = input.gates;
  if (!gates || typeof gates !== "object") {
    throw new Error("Publish gate failed: transition.gates is required");
  }
  if (gates.securityPassed !== true) {
    throw new Error("Publish gate failed: gates.securityPassed must be true");
  }
  if (gates.policyPassed !== true) {
    throw new Error("Publish gate failed: gates.policyPassed must be true");
  }
  if (gates.reviewPassed !== true) {
    throw new Error("Publish gate failed: gates.reviewPassed must be true");
  }
  if (gates.qaPassed !== true) {
    throw new Error("Publish gate failed: gates.qaPassed must be true");
  }
}

function assertPassGateRules(state, input) {
  if (input.stage === "script_composition") {
    assertScriptGate(input.artifact);
  }
  if (input.stage === "continuity_review") {
    if (input.artifact.decision !== "pass") {
      throw new Error('Continuity gate failed: pass transition requires artifact.decision "pass"');
    }
    if (hasBlockingContinuityFindings(input.artifact)) {
      throw new Error("Continuity gate failed: unresolved required/high-severity findings present");
    }
  }
  if (input.stage === "publish") {
    assertPublishGateInput(input);
  }
}

function assertNeedsFixesRules(input) {
  if (input.stage !== "continuity_review") return;
  if (!input.artifact) {
    throw new Error("Continuity review requires artifact when decision is needs_fixes");
  }
  if (input.artifact.decision !== "needs_fixes") {
    throw new Error('Continuity review needs_fixes requires artifact.decision "needs_fixes"');
  }
  if (!Array.isArray(input.artifact.findings) || input.artifact.findings.length === 0) {
    throw new Error("Continuity review needs_fixes requires at least one finding");
  }
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
  assertPrerequisites(state, input.stage);

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
    assertPassGateRules(state, input);

    state.artifacts[input.stage] = clone(input.artifact);
    if (input.gates && typeof input.gates === "object") {
      state.gateEvidence[input.stage] = clone(input.gates);
    }
    markStage(state, input.stage, "completed");
    recordLog(state, "stage_completed", { stage: input.stage });
    advanceToNextStage(state);
    return state;
  }

  if (input.decision === "needs_fixes") {
    if (input.artifact) {
      const artifactResult = validateArtifact(input.stage, input.artifact);
      if (!artifactResult.ok) {
        throw new Error(`Invalid artifact for stage "${input.stage}": ${artifactResult.errors.join("; ")}`);
      }
      state.artifacts[input.stage] = clone(input.artifact);
    }
    assertNeedsFixesRules(input);
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
