#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const REQUIRED_TEMPLATE_FILES = ["AGENTS.md", "SOUL.md", "IDENTITY.md"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeAllowAgents(subagents) {
  if (!subagents || typeof subagents !== "object") return [];
  if (!Array.isArray(subagents.allowAgents)) return [];
  return subagents.allowAgents.filter(isNonEmptyString);
}

function checkTopology(repoRoot) {
  const errors = [];
  const warnings = [];

  const topologyPath = path.join(repoRoot, "openclaw", "openclaw.json");
  const templatesRoot = path.join(repoRoot, "openclaw", "workspace-templates");

  if (!fs.existsSync(topologyPath)) {
    return { ok: false, errors: [`Missing topology file: ${topologyPath}`], warnings };
  }
  if (!fs.existsSync(templatesRoot)) {
    return { ok: false, errors: [`Missing templates root: ${templatesRoot}`], warnings };
  }

  const topology = readJson(topologyPath);
  if (!topology || typeof topology !== "object") {
    return { ok: false, errors: ["openclaw/openclaw.json must be an object"], warnings };
  }

  const agents = topology.agents && Array.isArray(topology.agents.list) ? topology.agents.list : null;
  if (!agents || agents.length === 0) {
    return { ok: false, errors: ["openclaw/openclaw.json must define agents.list with at least one entry"], warnings };
  }

  const ids = new Set();
  const defaults = [];
  for (const agent of agents) {
    if (!agent || typeof agent !== "object") {
      errors.push("Each agents.list item must be an object");
      continue;
    }

    if (!isNonEmptyString(agent.id)) {
      errors.push("Each agent must include a non-empty id");
      continue;
    }

    if (ids.has(agent.id)) {
      errors.push(`Duplicate agent id: ${agent.id}`);
    }
    ids.add(agent.id);

    if (agent.default === true) defaults.push(agent.id);

    if (agent.subagents && typeof agent.subagents === "object") {
      const unsupported = Object.keys(agent.subagents).filter((key) => key !== "allowAgents");
      if (unsupported.length > 0) {
        errors.push(`Agent "${agent.id}" has unsupported subagents key(s): ${unsupported.join(", ")}`);
      }
    }
  }

  if (defaults.length !== 1) {
    errors.push(`Exactly one default agent is required (found ${defaults.length})`);
  }
  if (!ids.has("main")) {
    errors.push('Required agent "main" is missing');
  }
  if (defaults.length === 1 && defaults[0] !== "main") {
    warnings.push(`Default agent is "${defaults[0]}", expected "main" for this repo pattern`);
  }

  for (const agent of agents) {
    if (!agent || typeof agent !== "object" || !isNonEmptyString(agent.id)) continue;
    const allowAgents = normalizeAllowAgents(agent.subagents);
    for (const target of allowAgents) {
      if (!ids.has(target)) {
        errors.push(`Agent "${agent.id}" allows unknown subagent "${target}"`);
      }
    }

    const templateDir = path.join(templatesRoot, agent.id);
    if (!fs.existsSync(templateDir)) {
      errors.push(`Missing template directory for agent "${agent.id}": ${templateDir}`);
      continue;
    }

    for (const fileName of REQUIRED_TEMPLATE_FILES) {
      const filePath = path.join(templateDir, fileName);
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing template file for agent "${agent.id}": ${filePath}`);
      }
    }
  }

  const mainAgent = agents.find((agent) => agent && agent.id === "main");
  if (mainAgent) {
    const mainAllow = normalizeAllowAgents(mainAgent.subagents);
    if (!mainAllow.includes("director")) {
      warnings.push('main does not allow "director"; project-team routing may break');
    }
    if (!mainAllow.includes("reliability_guardian")) {
      warnings.push('main does not allow "reliability_guardian"; oversight lane may break');
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const result = checkTopology(repoRoot);

  if (!result.ok) {
    console.error("OpenClaw topology check failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    for (const warning of result.warnings) {
      console.error(`warn: ${warning}`);
    }
    process.exit(1);
  }

  console.log("OpenClaw topology check passed.");
  for (const warning of result.warnings) {
    console.log(`warn: ${warning}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkTopology
};

