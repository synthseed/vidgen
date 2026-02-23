const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TODAY = new Date("2026-02-23T00:00:00Z");
const STALE_DAYS = 30;

function shouldTrack(relPath) {
  if (relPath === "AGENTS.md") return true;
  if (relPath === "ARCHITECTURE.md") return true;
  if (relPath.endsWith("/AGENTS.md")) return true;
  if (relPath.startsWith("docs/")) return true;
  if (relPath.startsWith("openclaw/") && relPath.endsWith(".md")) return true;
  return false;
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

function parseLastReviewed(text) {
  const lines = text.split(/\r?\n/).slice(0, 20);
  const line = lines.find((candidate) => candidate.startsWith("Last Reviewed:"));
  if (!line) return null;
  const raw = line.split(":").slice(1).join(":").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysOld(date) {
  return Math.floor((TODAY.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

async function main() {
  const strict = process.argv.includes("--strict");
  const files = await walk(ROOT);
  const markdownFiles = files
    .map(rel)
    .filter((p) => p.endsWith(".md"))
    .filter((p) => !p.startsWith(".git/"))
    .filter((p) => shouldTrack(p));

  const missingMetadata = [];
  const staleDocs = [];

  for (const relPath of markdownFiles) {
    const fullPath = path.join(ROOT, relPath);
    const text = await fs.readFile(fullPath, "utf8");
    const reviewed = parseLastReviewed(text);

    if (!reviewed) {
      missingMetadata.push(relPath);
      continue;
    }

    const age = daysOld(reviewed);
    if (age > STALE_DAYS) {
      staleDocs.push({ relPath, age });
    }
  }

  console.log("Doc Gardener Report");
  console.log(`- Total markdown files: ${markdownFiles.length}`);
  console.log(`- Missing Last Reviewed: ${missingMetadata.length}`);
  console.log(`- Stale docs (> ${STALE_DAYS} days): ${staleDocs.length}`);

  if (missingMetadata.length > 0) {
    console.log("\nMissing Last Reviewed:");
    for (const relPath of missingMetadata) {
      console.log(`- ${relPath}`);
    }
  }

  if (staleDocs.length > 0) {
    console.log("\nStale docs:");
    for (const doc of staleDocs.sort((a, b) => b.age - a.age)) {
      console.log(`- ${doc.relPath} (${doc.age} days old)`);
    }
  }

  if (strict && (missingMetadata.length > 0 || staleDocs.length > 0)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
