#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

function parseArgs(argv) {
  const args = {
    mode: "default",
    docStrict: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--mode") {
      args.mode = argv[i + 1] || args.mode;
      i += 1;
      continue;
    }
    if (token === "--doc-strict") {
      args.docStrict = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function nowMs() {
  return Date.now();
}

function runStep(step, cwd) {
  const startedAt = nowMs();
  const commandText = `${step.cmd} ${step.args.join(" ")}`.trim();
  console.log(`\n==> ${step.name}`);
  console.log(`    ${commandText}`);

  const result = spawnSync(step.cmd, step.args, {
    cwd,
    stdio: "inherit",
    shell: false
  });

  const elapsedMs = nowMs() - startedAt;
  if (result.status !== 0) {
    return {
      ok: false,
      elapsedMs,
      status: result.status,
      signal: result.signal
    };
  }

  return { ok: true, elapsedMs, status: 0, signal: null };
}

function buildSteps(options) {
  const docArgs = ["scripts/doc_gardener.js"];
  if (options.docStrict) docArgs.push("--strict");

  return [
    { name: "Topology", cmd: "node", args: ["scripts/openclaw_topology_check.js"] },
    { name: "Workflow Integrity", cmd: "node", args: ["scripts/workflow_integrity_check.js"] },
    { name: "Knowledge Base", cmd: "node", args: ["scripts/check_knowledge_base.js"] },
    { name: "Doc Gardener", cmd: "node", args: docArgs },
    { name: "Security Preflight", cmd: "node", args: ["scripts/security_preflight.js", "--strict"] },
    { name: "Pipeline Dry Run", cmd: "node", args: ["scripts/pipeline_orchestrator_dry_run.js"] }
  ];
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(__dirname, "..");
  const steps = buildSteps(options);

  console.log("Autonomy Preflight");
  console.log(`- mode: ${options.mode}`);
  console.log(`- doc_strict: ${options.docStrict ? "1" : "0"}`);
  console.log(`- steps: ${steps.length}`);

  const summary = [];
  const startAll = nowMs();

  for (const step of steps) {
    const result = runStep(step, root);
    summary.push({ step: step.name, ...result });
    if (!result.ok) {
      console.error(
        `\nAutonomy preflight failed at "${step.name}" (exit=${result.status}, elapsed=${result.elapsedMs}ms).`
      );
      process.exit(result.status || 1);
    }
  }

  const totalMs = nowMs() - startAll;
  console.log("\nAutonomy Preflight Summary");
  for (const item of summary) {
    console.log(`- ${item.step}: ok (${item.elapsedMs}ms)`);
  }
  console.log(`- total: ${totalMs}ms`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

