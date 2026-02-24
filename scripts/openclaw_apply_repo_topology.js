#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {
    runtimeConfig: "/data/.openclaw/openclaw.json",
    repoConfig: "/data/repos/vidgen/openclaw/openclaw.json",
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

  const normalized = { id: agent.id };

  if (agent.default === true) normalized.default = true;
  if (isNonEmptyString(agent.model)) normalized.model = agent.model;

  if (agent.subagents && typeof agent.subagents === "object") {
    const allow = Array.isArray(agent.subagents.allowAgents)
      ? [...new Set(agent.subagents.allowAgents.filter(isNonEmptyString))]
      : [];
    if (allow.length > 0) {
      normalized.subagents = { allowAgents: allow };
    }
  }

  return normalized;
}

function normalizeAgentsList(list) {
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

  if (!ids.has("main")) {
    throw new Error('Repo topology must include agent id "main"');
  }

  let defaults = normalized.filter((item) => item.default === true);
  if (defaults.length === 0) {
    const main = normalized.find((item) => item.id === "main");
    main.default = true;
    defaults = [main];
  } else if (defaults.length > 1) {
    for (const item of normalized) {
      delete item.default;
    }
    const main = normalized.find((item) => item.id === "main");
    if (main) {
      main.default = true;
    } else {
      normalized[0].default = true;
    }
  }

  return normalized;
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

  const normalizedList = normalizeAgentsList(repo.agents && repo.agents.list);
  const main = normalizedList.find((entry) => entry.id === "main");

  runtime.agents = runtime.agents || {};
  runtime.agents.list = normalizedList;

  if (main && isNonEmptyString(main.model)) {
    runtime.agents.defaults = runtime.agents.defaults || {};
    const modelDefaults =
      runtime.agents.defaults.model && typeof runtime.agents.defaults.model === "object"
        ? runtime.agents.defaults.model
        : {};
    modelDefaults.primary = main.model;
    if (!Array.isArray(modelDefaults.fallbacks)) {
      modelDefaults.fallbacks = [];
    }
    runtime.agents.defaults.model = modelDefaults;
  }

  runtime.meta = runtime.meta || {};
  runtime.meta.lastTouchedAt = new Date().toISOString();

  if (args.dryRun) {
    console.log("dry-run: would apply repo topology to runtime config");
    console.log(`runtime: ${args.runtimeConfig}`);
    console.log(`repo: ${args.repoConfig}`);
    console.log(`agents.list count: ${normalizedList.length}`);
    return;
  }

  const backupPath = `${args.runtimeConfig}.bak.${Date.now()}`;
  fs.copyFileSync(args.runtimeConfig, backupPath);
  writeJsonAtomic(args.runtimeConfig, runtime);

  console.log(`applied repo topology to runtime config: ${args.runtimeConfig}`);
  console.log(`backup written: ${backupPath}`);
}

try {
  run();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}

