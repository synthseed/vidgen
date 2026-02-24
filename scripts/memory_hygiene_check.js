#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TODAY = new Date("2026-02-24T00:00:00Z");
const WARN_REVIEW_AGE_DAYS = 14;
const WARN_MAX_LINES = 220;
const WARN_MAX_BYTES = 16 * 1024;

const REQUIRED_METADATA = ["Owner", "Status", "Last Reviewed"];
const REQUIRED_SECTION_HEADINGS = [
  "## Purpose",
  "## Memory Contract",
  "## Memory Model",
  "## Semantic Memory",
  "## Procedural Memory",
  "## Episodic Memory",
  "## Compaction Rules",
  "## Update Cadence",
  "## Role-Specific Capture Checklist"
];

const SECTION_MIN_SIGNAL_LINES = {
  "## Purpose": 1,
  "## Memory Contract": 3,
  "## Memory Model": 3,
  "## Semantic Memory": 1,
  "## Procedural Memory": 1,
  "## Episodic Memory": 1,
  "## Compaction Rules": 2,
  "## Update Cadence": 2,
  "## Role-Specific Capture Checklist": 3
};

function parseArgs(argv) {
  const args = {
    strict: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--strict") {
      args.strict = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ageDays(date) {
  return Math.floor((TODAY.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function collectHeadings(lines) {
  return lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter((entry) => /^##\s+/.test(entry.line));
}

function sectionBody(lines, heading) {
  const headings = collectHeadings(lines);
  const currentIndex = headings.findIndex((entry) => entry.line === heading);
  if (currentIndex < 0) return null;
  const start = headings[currentIndex].index + 1;
  const end = currentIndex + 1 < headings.length ? headings[currentIndex + 1].index : lines.length;
  return lines.slice(start, end);
}

function isSignalLine(line) {
  const text = line.trim();
  if (!text) return false;
  if (/^\|/.test(text)) return false; // markdown table rows are often placeholders
  if (/^\|\s*-+\s*\|/.test(text)) return false;
  if (/^\[[A-Z0-9_-]+\]/.test(text)) return false; // placeholder-style markers
  if (/^\-\s*\[YYYY-MM-DD\]/i.test(text)) return false;
  return true;
}

function parseMetadata(lines) {
  const header = lines.slice(0, 20);
  const out = {};
  for (const key of REQUIRED_METADATA) {
    const found = header.find((line) => line.startsWith(`${key}:`));
    out[key] = found ? found.slice(key.length + 1).trim() : "";
  }
  return out;
}

async function listAgentTemplateMemoryFiles() {
  const templatesRoot = path.join(ROOT, "openclaw", "workspace-templates");
  const entries = await fs.readdir(templatesRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      agentId: entry.name,
      filePath: path.join(templatesRoot, entry.name, "MEMORY.md"),
      relPath: `openclaw/workspace-templates/${entry.name}/MEMORY.md`
    }))
    .sort((a, b) => a.agentId.localeCompare(b.agentId));
}

async function checkOneMemoryFile(item, warnings, errors) {
  let text = "";
  try {
    text = await fs.readFile(item.filePath, "utf8");
  } catch {
    errors.push(`${item.relPath}: missing MEMORY.md`);
    return;
  }

  const lines = text.split(/\r?\n/);
  const metadata = parseMetadata(lines);

  for (const key of REQUIRED_METADATA) {
    if (!isNonEmptyString(metadata[key])) {
      errors.push(`${item.relPath}: missing metadata field "${key}" in first 20 lines`);
    }
  }

  if (isNonEmptyString(metadata["Last Reviewed"])) {
    const parsed = parseIsoDate(metadata["Last Reviewed"]);
    if (!parsed) {
      errors.push(`${item.relPath}: invalid Last Reviewed date "${metadata["Last Reviewed"]}"`);
    } else {
      const age = ageDays(parsed);
      if (age > WARN_REVIEW_AGE_DAYS) {
        warnings.push(
          `${item.relPath}: Last Reviewed is ${age} days old (recommended <= ${WARN_REVIEW_AGE_DAYS})`
        );
      }
    }
  }

  if (lines.length > WARN_MAX_LINES) {
    warnings.push(`${item.relPath}: ${lines.length} lines (recommended <= ${WARN_MAX_LINES})`);
  }
  if (Buffer.byteLength(text, "utf8") > WARN_MAX_BYTES) {
    warnings.push(`${item.relPath}: exceeds ${WARN_MAX_BYTES} bytes (consider compaction)`);
  }

  const headingSet = new Set(collectHeadings(lines).map((entry) => entry.line));
  for (const heading of REQUIRED_SECTION_HEADINGS) {
    if (!headingSet.has(heading)) {
      errors.push(`${item.relPath}: missing required section heading "${heading}"`);
    }
  }

  for (const heading of REQUIRED_SECTION_HEADINGS) {
    const body = sectionBody(lines, heading);
    if (!body) continue;
    const signalLines = body.filter(isSignalLine).length;
    const minSignalLines = SECTION_MIN_SIGNAL_LINES[heading] || 1;
    if (signalLines < minSignalLines) {
      warnings.push(
        `${item.relPath}: section "${heading}" appears sparse (${signalLines} signal lines, recommended >= ${minSignalLines})`
      );
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const warnings = [];
  const errors = [];

  const memoryFiles = await listAgentTemplateMemoryFiles();
  for (const item of memoryFiles) {
    await checkOneMemoryFile(item, warnings, errors);
  }

  console.log("Memory Hygiene Report");
  console.log(`- Files checked: ${memoryFiles.length}`);
  console.log(`- Errors: ${errors.length}`);
  console.log(`- Warnings: ${warnings.length}`);

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

  if (args.strict && warnings.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
