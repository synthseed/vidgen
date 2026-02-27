#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {
    runtimeConfig: "/data/.openclaw/openclaw.json",
    repoConfig: "/data/repos/vidgen/openclaw/openclaw.json",
    requiredAgent: process.env.REQUIRED_AGENT_ID || "main",
    defaultAgent: process.env.DEFAULT_ORCHESTRATOR_AGENT || "main",
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--runtime-config") {
      args.runtimeConfig = argv[i + 1] || args.runtimeConfig;
      i += 1;
      continue;
    }
    if (token === "--repo-config") {
      args.repoConfig = argv[i + 1] || args.repoConfig;
      i += 1;
      continue;
    }
    if (token === "--required-agent") {
      args.requiredAgent = argv[i + 1] || args.requiredAgent;
      i += 1;
      continue;
    }
    if (token === "--default-agent") {
      args.defaultAgent = argv[i + 1] || args.defaultAgent;
      i += 1;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, data) {
  const dirPath = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const tmpPath = path.join(dirPath, `${baseName}.tmp-${process.pid}-${Date.now()}`);
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeAgent(agent) {
  if (!agent || typeof agent !== "object") {
    throw new Error("Agent entries must be objects");
  }
  if (!isNonEmptyString(agent.id)) {
    throw new Error("Each agent requires a non-empty id");
  }

  const normalized = { ...agent, id: agent.id };

  if (agent.default !== true) delete normalized.default;
  if (!isNonEmptyString(agent.model)) delete normalized.model;

  if (agent.subagents && typeof agent.subagents === "object") {
    const allow = Array.isArray(agent.subagents.allowAgents)
      ? [...new Set(agent.subagents.allowAgents.filter(isNonEmptyString))]
      : [];
    if (allow.length > 0) {
      normalized.subagents = { ...(agent.subagents || {}), allowAgents: allow };
    } else {
      delete normalized.subagents;
    }
  } else {
    delete normalized.subagents;
  }

  return normalized;
}

function normalizeAgentsList(list, options = {}) {
  const requiredAgent = options.requiredAgent || "main";
  const defaultAgent = options.defaultAgent || requiredAgent;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Repo topology must contain agents.list with at least one entry");
  }

  const ids = new Set();
  const normalized = [];
  for (const entry of list) {
    const item = normalizeAgent(entry);
    if (ids.has(item.id)) {
      throw new Error(`Duplicate agent id in repo topology: ${item.id}`);
    }
    ids.add(item.id);
    normalized.push(item);
  }

  if (!ids.has(requiredAgent)) {
    throw new Error(`Repo topology must include agent id "${requiredAgent}"`);
  }
  if (!ids.has(defaultAgent)) {
    throw new Error(`Default agent "${defaultAgent}" is missing from repo topology`);
  }

  let defaults = normalized.filter((item) => item.default === true);
  if (defaults.length === 0) {
    const target = normalized.find((item) => item.id === defaultAgent);
    target.default = true;
    defaults = [target];
  } else if (defaults.length > 1) {
    for (const item of normalized) {
      delete item.default;
    }
    const target = normalized.find((item) => item.id === defaultAgent);
    if (target) {
      target.default = true;
    } else {
      normalized[0].default = true;
    }
  }

  return normalized;
}

function enforceSafeControlUi(runtime) {
  runtime.gateway = runtime.gateway && typeof runtime.gateway === "object" ? runtime.gateway : {};
  runtime.gateway.controlUi =
    runtime.gateway.controlUi && typeof runtime.gateway.controlUi === "object"
      ? runtime.gateway.controlUi
      : {};

  const required = {
    allowInsecureAuth: false,
    dangerouslyAllowHostHeaderOriginFallback: false,
    dangerouslyDisableDeviceAuth: false
  };

  const corrected = [];
  for (const [key, expected] of Object.entries(required)) {
    if (runtime.gateway.controlUi[key] !== expected) {
      corrected.push({ key, from: runtime.gateway.controlUi[key], to: expected });
      runtime.gateway.controlUi[key] = expected;
    }
  }

  return corrected;
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.runtimeConfig)) {
    throw new Error(`Runtime config not found: ${args.runtimeConfig}`);
  }
  if (!fs.existsSync(args.repoConfig)) {
    throw new Error(`Repo config not found: ${args.repoConfig}`);
  }

  const runtime = readJson(args.runtimeConfig);
  const repo = readJson(args.repoConfig);

  const normalizedList = normalizeAgentsList(repo.agents && repo.agents.list, {
    requiredAgent: args.requiredAgent,
    defaultAgent: args.defaultAgent
  });
  const defaultAgent = normalizedList.find((entry) => entry.id === args.defaultAgent);

  runtime.agents = runtime.agents || {};
  runtime.agents.list = normalizedList;

  if (defaultAgent && isNonEmptyString(defaultAgent.model)) {
    runtime.agents.defaults = runtime.agents.defaults || {};
    const modelDefaults =
      runtime.agents.defaults.model && typeof runtime.agents.defaults.model === "object"
        ? runtime.agents.defaults.model
        : {};
    modelDefaults.primary = defaultAgent.model;
    if (!Array.isArray(modelDefaults.fallbacks)) {
      modelDefaults.fallbacks = [];
    }
    runtime.agents.defaults.model = modelDefaults;
  }

  const correctedControlUi = enforceSafeControlUi(runtime);

  runtime.meta = runtime.meta || {};
  runtime.meta.lastTouchedAt = new Date().toISOString();

  if (args.dryRun) {
    console.log("dry-run: would apply repo topology to runtime config");
    console.log(`runtime: ${args.runtimeConfig}`);
    console.log(`repo: ${args.repoConfig}`);
    console.log(`agents.list count: ${normalizedList.length}`);
    if (correctedControlUi.length > 0) {
      console.log(`controlUi guard: would auto-correct ${correctedControlUi.length} unsafe flag(s)`);
    } else {
      console.log("controlUi guard: no unsafe flags detected");
    }
    return;
  }

  const backupPath = `${args.runtimeConfig}.bak.${Date.now()}`;
  fs.copyFileSync(args.runtimeConfig, backupPath);
  writeJsonAtomic(args.runtimeConfig, runtime);

  console.log(`applied repo topology to runtime config: ${args.runtimeConfig}`);
  if (correctedControlUi.length > 0) {
    for (const entry of correctedControlUi) {
      console.log(
        `controlUi guard auto-corrected ${entry.key}: ${JSON.stringify(entry.from)} -> ${JSON.stringify(entry.to)}`
      );
    }
  } else {
    console.log("controlUi guard: no unsafe flags detected");
  }
  console.log(`backup written: ${backupPath}`);
}

try {
  run();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}

