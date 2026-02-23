const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TODAY = new Date("2026-02-23T00:00:00Z");
const MAX_DOC_AGE_DAYS = 45;

const REQUIRED_FILES = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "docs/README.md",
  "docs/DESIGN.md",
  "docs/PLANS.md",
  "docs/PRODUCT_SENSE.md",
  "docs/QUALITY_SCORE.md",
  "docs/RELIABILITY.md",
  "docs/SECURITY.md",
  "docs/design-docs/index.md",
  "docs/design-docs/core-beliefs.md",
  "docs/exec-plans/active/README.md",
  "docs/exec-plans/completed/README.md",
  "docs/exec-plans/tech-debt-tracker.md",
  "docs/generated/db-schema.md",
  "docs/product-specs/index.md",
  "docs/product-specs/youtube-upload.md",
  "docs/product-specs/trend-to-video-pipeline.md",
  "docs/references/youtube-data-api-notes.md",
  "docs/references/openai-harness-engineering-notes.md",
  "openclaw/README.md",
  "openclaw/openclaw.json",
  "scripts/AGENTS.md",
  "scripts/doc_gardener.js",
  "scripts/check_knowledge_base.js",
  "scripts/security_preflight.js",
  "scripts/vps_autosync_status.sh",
  "scripts/vps_autosync_run_once.sh",
  "scripts/workflow_integrity_check.js",
  ".github/workflows/docs-knowledge-check.yml",
  ".github/workflows/deploy-openclaw-vps.yml"
];

const REQUIRED_METADATA = ["Owner", "Status", "Last Reviewed"];

function shouldValidateMetadata(relPath) {
  if (relPath === "AGENTS.md") return true;
  if (relPath === "ARCHITECTURE.md") return true;
  if (relPath.endsWith("/AGENTS.md")) return true;
  if (relPath.startsWith("docs/")) return true;
  if (relPath.startsWith("openclaw/") && relPath.endsWith(".md")) return true;
  return false;
}

async function fileExists(relPath) {
  try {
    await fs.access(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
      continue;
    }
    if (entry.isFile()) out.push(full);
  }
  return out;
}

function rel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, "/");
}

function parseMetadata(text) {
  const lines = text.split(/\r?\n/).slice(0, 20);
  const meta = {};

  for (const key of REQUIRED_METADATA) {
    const line = lines.find((candidate) => candidate.startsWith(`${key}:`));
    if (line) meta[key] = line.slice(key.length + 1).trim();
  }

  return meta;
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ageDays(date) {
  return Math.floor((TODAY.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

async function main() {
  const errors = [];
  const warnings = [];

  for (const relPath of REQUIRED_FILES) {
    if (!(await fileExists(relPath))) {
      errors.push(`Missing required file: ${relPath}`);
    }
  }

  const allFiles = await walk(ROOT);
  const markdownFiles = allFiles
    .map(rel)
    .filter((p) => p.endsWith(".md"))
    .filter((p) => !p.startsWith(".git/"));

  for (const relPath of markdownFiles) {
    if (!shouldValidateMetadata(relPath)) continue;

    const fullPath = path.join(ROOT, relPath);
    const text = await fs.readFile(fullPath, "utf8");

    const meta = parseMetadata(text);
    for (const key of REQUIRED_METADATA) {
      if (!meta[key]) {
        errors.push(`${relPath}: missing metadata field "${key}" in first 20 lines`);
      }
    }

    if (meta["Last Reviewed"]) {
      const parsed = parseIsoDate(meta["Last Reviewed"]);
      if (!parsed) {
        errors.push(`${relPath}: invalid Last Reviewed date "${meta["Last Reviewed"]}"`);
      } else {
        const days = ageDays(parsed);
        if (days > MAX_DOC_AGE_DAYS) {
          errors.push(`${relPath}: stale doc (${days} days since review, max ${MAX_DOC_AGE_DAYS})`);
        } else if (days > 30) {
          warnings.push(`${relPath}: should be refreshed soon (${days} days old)`);
        }
      }
    }

    if (relPath.startsWith("docs/") && !/Related Docs/i.test(text)) {
      warnings.push(`${relPath}: missing "Related Docs" section`);
    }
  }

  const rootAgents = await fs.readFile(path.join(ROOT, "AGENTS.md"), "utf8");
  const agentLines = rootAgents.split(/\r?\n/);
  if (agentLines.length > 180) {
    errors.push(`AGENTS.md is too long (${agentLines.length} lines). Keep it map-style and concise.`);
  }
  if (!/This file is intentionally short\./.test(rootAgents)) {
    errors.push('AGENTS.md must include "This file is intentionally short."');
  }

  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error("Knowledge base checks failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Knowledge base checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
