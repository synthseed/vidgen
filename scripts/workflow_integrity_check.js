#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DOCS_WORKFLOW = ".github/workflows/docs-knowledge-check.yml";
const DEPLOY_WORKFLOW = ".github/workflows/deploy-openclaw-vps.yml";
const AUTONOMOUS_WORKFLOW = ".github/workflows/autonomous-pipeline.yml";

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

function requireAnySnippet(text, relPath, snippets, description, errors) {
  if (!snippets.some((snippet) => text.includes(snippet))) {
    errors.push(`${relPath}: ${description}`);
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
  const autonomous = readFile(AUTONOMOUS_WORKFLOW);

  requireSnippets(
    docs,
    DOCS_WORKFLOW,
    [
      "name: Docs Knowledge Check",
      "push:",
      "- dev",
      "- main",
      "name: Autonomy Preflight (default)",
      "name: Autonomy Preflight (strict schedule)",
      "node scripts/autonomy_preflight.js --mode ci",
      "node scripts/autonomy_preflight.js --mode ci --doc-strict",
      "uses: reviewdog/action-actionlint@v1"
    ],
    errors
  );

  requireSnippets(
    deploy,
    DEPLOY_WORKFLOW,
    [
      "name: Deploy OpenClaw VPS",
      "workflow_dispatch:",
      "workflow_call:",
      "concurrency:",
      "runs-on: ubuntu-latest",
      "name: Autonomy Preflight (deploy gate)",
      "node scripts/autonomy_preflight.js --mode ci",
      "name: Validate Deploy Secrets",
      "id: deploy_secrets",
      "name: Enforce Deploy Secrets",
      "steps.deploy_secrets.outputs.enabled != 'true'",
      "name: Validate Tailscale Secret Format",
      "name: Deploy Auth Summary",
      "name: Connect Tailscale (OAuth)",
      "name: Connect Tailscale (Authkey)",
      "name: Connect Tailscale (Fallback Manual Up)",
      "uses: tailscale/github-action@v4",
      "name: Fail With Tailscale Diagnostics",
      "name: Preflight Tailnet Reachability",
      "tailscale ping --timeout=10s",
      "name: Deploy via Tailscale SSH",
      "tailscale ssh",
      "scripts/vps_autosync_openclaw.sh",
      "name: Post-deploy VPS Status Validation",
      "STRICT_EXIT=1",
      "scripts/vps_autosync_status.sh",
      "name: Disconnect Tailscale",
      "tailscale logout || true"
    ],
    errors
  );

  requireAnySnippet(
    deploy,
    DEPLOY_WORKFLOW,
    ["group: deploy-openclaw-vps-dev", "group: deploy-openclaw-vps-${{"],
    'must define stable deploy concurrency group (fixed or branch-derived)',
    errors
  );

  requireRegex(
    deploy,
    DEPLOY_WORKFLOW,
    /env:\s*\n\s*VPS_HOST:\s*\$\{\{\s*secrets\.VPS_HOST\s*\}\}\s*\n\s*VPS_USER:\s*\$\{\{\s*secrets\.VPS_USER\s*\}\}\s*\n\s*TS_OAUTH_CLIENT_ID:\s*\$\{\{\s*secrets\.TS_OAUTH_CLIENT_ID\s*\}\}\s*\n\s*TS_OAUTH_SECRET:\s*\$\{\{\s*secrets\.TS_OAUTH_SECRET\s*\}\}\s*\n\s*TAILSCALE_AUTHKEY:\s*\$\{\{\s*secrets\.TAILSCALE_AUTHKEY\s*\}\}/m,
    "must validate VPS + Tailscale secrets via env in 'Validate Deploy Secrets' step (including TAILSCALE_AUTHKEY fallback)",
    errors
  );

  requireRegex(
    deploy,
    DEPLOY_WORKFLOW,
    /TS_TAGS:\s*\$\{\{\s*secrets\.TS_TAGS\s*\}\}/m,
    "must support optional TS_TAGS secret in 'Validate Deploy Secrets' step",
    errors
  );

  requireSnippets(
    autonomous,
    AUTONOMOUS_WORKFLOW,
    [
      "name: Autonomous Pipeline",
      "push:",
      "- dev",
      "pull_request:",
      "- main",
      "name: Supervised dry-run gates",
      "bash scripts/supervised_dry_run.sh",
      "name: Enforce PR evidence + branch policy",
      "node scripts/pr_evidence_check.js",
      "uses: ./.github/workflows/deploy-openclaw-vps.yml",
      "promotion_readiness"
    ],
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
  console.log(`- Checked: ${AUTONOMOUS_WORKFLOW}`);

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
