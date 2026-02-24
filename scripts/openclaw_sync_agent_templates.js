#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const REQUIRED_FILES = ["AGENTS.md", "SOUL.md", "IDENTITY.md", "MEMORY.md"];

function parseArgs(argv) {
  const args = {
    repoRoot: path.resolve(__dirname, ".."),
    openclawHome: process.env.OPENCLAW_HOME || "/data/.openclaw",
    dryRun: false,
    strict: false,
    agents: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--strict") {
      args.strict = true;
      continue;
    }
    if (token === "--repo-root") {
      args.repoRoot = path.resolve(argv[i + 1] || "");
      i += 1;
      continue;
    }
    if (token === "--openclaw-home") {
      args.openclawHome = argv[i + 1] || args.openclawHome;
      i += 1;
      continue;
    }
    if (token === "--agent") {
      const agent = argv[i + 1];
      if (!agent) throw new Error("--agent requires a value");
      args.agents.push(agent);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function ensureDir(dirPath, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function listTemplateAgents(templatesRoot) {
  if (!fs.existsSync(templatesRoot)) {
    throw new Error(`Templates root not found: ${templatesRoot}`);
  }

  return fs
    .readdirSync(templatesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function copyTemplateFile(srcPath, dstPath, dryRun) {
  if (dryRun) return;
  fs.copyFileSync(srcPath, dstPath);
}

function unique(items) {
  return [...new Set(items)];
}

function resolveTargetDirs(openclawHome, agentId) {
  const primary = path.join(openclawHome, "agents", agentId, "agent");
  const legacyWorkspace = path.join(openclawHome, `workspace-${agentId}`);
  const nestedWorkspace = path.join(openclawHome, "workspaces", "agents", agentId, "agent");

  // Always sync all known runtime layouts to avoid UI/runtime path drift.
  return unique([primary, legacyWorkspace, nestedWorkspace]);
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const templatesRoot = path.join(args.repoRoot, "openclaw", "workspace-templates");
  const discoveredAgents = listTemplateAgents(templatesRoot);
  const requestedAgents = args.agents.length > 0 ? args.agents : discoveredAgents;

  const missingAgents = requestedAgents.filter((agent) => !discoveredAgents.includes(agent));
  if (missingAgents.length > 0) {
    throw new Error(`Unknown template agent(s): ${missingAgents.join(", ")}`);
  }

  let copiedCount = 0;
  let targetDirCount = 0;
  const warnings = [];

  for (const agentId of requestedAgents) {
    const srcAgentDir = path.join(templatesRoot, agentId);
    const targetDirs = resolveTargetDirs(args.openclawHome, agentId);
    targetDirCount += targetDirs.length;

    for (const dstAgentDir of targetDirs) {
      ensureDir(dstAgentDir, args.dryRun);
      console.log(`${args.dryRun ? "would sync" : "syncing"} ${agentId} -> ${dstAgentDir}`);

      for (const fileName of REQUIRED_FILES) {
        const srcFile = path.join(srcAgentDir, fileName);
        const dstFile = path.join(dstAgentDir, fileName);

        if (!fs.existsSync(srcFile)) {
          const message = `Missing template file for ${agentId}: ${srcFile}`;
          if (args.strict) throw new Error(message);
          warnings.push(message);
          continue;
        }

        copyTemplateFile(srcFile, dstFile, args.dryRun);
        copiedCount += 1;
        console.log(`${args.dryRun ? "would copy" : "copied"} ${srcFile} -> ${dstFile}`);
      }
    }
  }

  for (const warning of warnings) {
    console.error(`warn: ${warning}`);
  }

  console.log(
    `${args.dryRun ? "dry run complete" : "sync complete"}: ${requestedAgents.length} agent(s), ${targetDirCount} target dir(s), ${copiedCount} file(s)`
  );
}

try {
  run();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
