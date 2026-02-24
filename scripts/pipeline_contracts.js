function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value) {
  if (!isString(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function result(errors) {
  return { ok: errors.length === 0, errors };
}

function validateRunEnvelope(input) {
  const errors = [];
  if (!isObject(input)) return result(["RunEnvelope must be an object"]);

  if (!isString(input.runId)) errors.push("RunEnvelope.runId is required");
  if (!isString(input.idempotencyKey)) errors.push("RunEnvelope.idempotencyKey is required");
  if (!isString(input.ownerAgent)) errors.push("RunEnvelope.ownerAgent is required");
  if (!isIsoDate(input.startedAt)) errors.push("RunEnvelope.startedAt must be ISO date/time");

  return result(errors);
}

function validateTrendDossier(input) {
  const errors = [];
  if (!isObject(input)) return result(["TrendDossier must be an object"]);

  if (!Array.isArray(input.candidates) || input.candidates.length === 0) {
    errors.push("TrendDossier.candidates must contain at least one candidate");
  }
  if (!Array.isArray(input.citations) || input.citations.length === 0) {
    errors.push("TrendDossier.citations must contain at least one citation");
  }

  return result(errors);
}

function validateTopicRanking(input) {
  const errors = [];
  if (!isObject(input)) return result(["TopicRanking must be an object"]);

  if (!isString(input.selectedTopic)) errors.push("TopicRanking.selectedTopic is required");
  if (!isString(input.rationale)) errors.push("TopicRanking.rationale is required");

  return result(errors);
}

function validateScriptPackage(input) {
  const errors = [];
  if (!isObject(input)) return result(["ScriptPackage must be an object"]);

  if (!isString(input.hook)) errors.push("ScriptPackage.hook is required");
  if (!Array.isArray(input.scenes) || input.scenes.length === 0) {
    errors.push("ScriptPackage.scenes must contain at least one scene");
  }
  if (!Array.isArray(input.assetPlan) || input.assetPlan.length === 0) {
    errors.push("ScriptPackage.assetPlan must contain at least one asset entry");
  }

  return result(errors);
}

function validateContinuityReport(input) {
  const errors = [];
  if (!isObject(input)) return result(["ContinuityReport must be an object"]);

  if (input.decision !== "pass" && input.decision !== "needs_fixes") {
    errors.push('ContinuityReport.decision must be "pass" or "needs_fixes"');
  }
  if (!Array.isArray(input.findings)) {
    errors.push("ContinuityReport.findings must be an array");
  }

  return result(errors);
}

function validateRenderManifest(input) {
  const errors = [];
  if (!isObject(input)) return result(["RenderManifest must be an object"]);

  if (!Array.isArray(input.jobIds) || input.jobIds.length === 0) {
    errors.push("RenderManifest.jobIds must contain at least one provider job id");
  }
  if (!Array.isArray(input.outputs) || input.outputs.length === 0) {
    errors.push("RenderManifest.outputs must contain at least one output artifact");
  }

  return result(errors);
}

function validatePublishReceipt(input) {
  const errors = [];
  if (!isObject(input)) return result(["PublishReceipt must be an object"]);

  if (!isString(input.videoId)) errors.push("PublishReceipt.videoId is required");
  if (!isString(input.videoUrl)) errors.push("PublishReceipt.videoUrl is required");
  if (!isString(input.visibility)) errors.push("PublishReceipt.visibility is required");

  return result(errors);
}

function validateOpsLog(input) {
  const errors = [];
  if (!isObject(input)) return result(["OpsLog must be an object"]);
  if (!Array.isArray(input.entries)) errors.push("OpsLog.entries must be an array");
  return result(errors);
}

function validateArtifact(stage, artifact) {
  switch (stage) {
    case "trend_intake":
      return validateTrendDossier(artifact);
    case "topic_ranking":
      return validateTopicRanking(artifact);
    case "script_composition":
      return validateScriptPackage(artifact);
    case "continuity_review":
      return validateContinuityReport(artifact);
    case "render":
    case "qa_gate":
      return validateRenderManifest(artifact);
    case "publish":
      return validatePublishReceipt(artifact);
    case "feedback":
      return validateOpsLog(artifact);
    default:
      return result([]);
  }
}

module.exports = {
  validateRunEnvelope,
  validateTrendDossier,
  validateTopicRanking,
  validateScriptPackage,
  validateContinuityReport,
  validateRenderManifest,
  validatePublishReceipt,
  validateOpsLog,
  validateArtifact
};
