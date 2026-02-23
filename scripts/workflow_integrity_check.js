#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DOCS_WORKFLOW = ".github/workflows/docs-knowledge-check.yml";
const DEPLOY_WORKFLOW = ".github/workflows/deploy-openclaw-vps.yml";

function readFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing workflow file: ${relPath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireSnippets(text, relPath, snippets, errors) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      errors.push(`${relPath}: missing required snippet "${snippet}"`);
    }
  }
}

function requireRegex(text, relPath, pattern, description, errors) {
  if (!pattern.test(text)) {
    errors.push(`${relPath}: ${description}`);
  }
}

function main() {
  const errors = [];
  const warnings = [];

  const docs = readFile(DOCS_WORKFLOW);
  const deploy = readFile(DEPLOY_WORKFLOW);

  requireSnippets(
    docs,
    DOCS_WORKFLOW,
    [
      "name: Docs Knowledge Check",
      "push:",
      "- dev",
      "- main",
      "node scripts/openclaw_topology_check.js",
      "node scripts/workflow_integrity_check.js",
      "node scripts/check_knowledge_base.js",
      "node scripts/security_preflight.js --strict",
      "node scripts/pipeline_orchestrator_dry_run.js",
      "uses: rhysd/actionlint@"
    ],
    errors
  );

  requireSnippets(
    deploy,
    DEPLOY_WORKFLOW,
    [
      "name: Deploy OpenClaw VPS",
      "workflow_run:",
      "- Docs Knowledge Check",
      "types:",
      "- completed",
      "github.event.workflow_run.conclusion == 'success'",
      "github.event.workflow_run.head_branch == 'dev'",
      "github.event.workflow_run.event == 'push'",
      "name: Validate VPS Secrets",
      "id: vps_secrets",
      "steps.vps_secrets.outputs.enabled == 'true'",
      "uses: appleboy/ssh-action@v1.2.2",
      "bash /docker/openclaw-jnqf/data/repos/vidgen/scripts/vps_autosync_openclaw.sh"
    ],
    errors
  );

  requireRegex(
    deploy,
    DEPLOY_WORKFLOW,
    /env:\s*\n\s*VPS_HOST:\s*\$\{\{\s*secrets\.VPS_HOST\s*\}\}\s*\n\s*VPS_USER:\s*\$\{\{\s*secrets\.VPS_USER\s*\}\}\s*\n\s*VPS_SSH_KEY:\s*\$\{\{\s*secrets\.VPS_SSH_KEY\s*\}\}/m,
    "must validate VPS_HOST/VPS_USER/VPS_SSH_KEY secrets via env in 'Validate VPS Secrets' step",
    errors
  );

  const disallowedSecretsIf = deploy
    .split(/\r?\n/)
    .filter((line) => /^\s*if:\s*.*\bsecrets\./.test(line))
    .map((line) => line.trim());
  if (disallowedSecretsIf.length > 0) {
    errors.push(
      `${DEPLOY_WORKFLOW}: disallowed secrets reference in if-expression (${disallowedSecretsIf.join(" | ")})`
    );
  }

  if (!docs.includes("schedule:")) {
    warnings.push(`${DOCS_WORKFLOW}: schedule trigger is missing (recommended for periodic guard checks)`);
  }

  console.log("Workflow Integrity Report");
  console.log(`- Checked: ${DOCS_WORKFLOW}`);
  console.log(`- Checked: ${DEPLOY_WORKFLOW}`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error("\nErrors:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Workflow integrity checks passed.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

