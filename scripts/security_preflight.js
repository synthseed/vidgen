const fs = require("fs/promises");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ALLOW_TOKEN = "security:allow";

const INSTALL_PATTERNS = [
  /\bcodex\b.*\bskill\b.*\binstall\b/i,
  /\bskill-installer\b/i,
  /\bplugin(s)?\b.*\binstall\b/i,
  /\bnpm\s+install\b/i,
  /\bpnpm\s+add\b/i,
  /\byarn\s+add\b/i,
  /\bpip(?:3)?\s+install\b/i,
  /\bapt(?:-get)?\s+install\b/i,
  /\bbrew\s+install\b/i,
  /\bchoco\s+install\b/i
];

const DESTRUCTIVE_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bRemove-Item\b.*\b-Recurse\b.*\b-Force\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+push\b.*\s--force\b/i,
  /\bdel\s+\/s\s+\/q\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bTRUNCATE\s+TABLE\b/i
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all|any|previous)\s+instructions/i,
  /disregard\s+(all|any|previous)\s+instructions/i,
  /reveal\s+(the\s+)?(system|developer)\s+prompt/i,
  /bypass\s+(policy|guardrail|safety)/i,
  /act\s+as\s+system/i
];

const CHECK_PATHS = [
  "scripts",
  "docs",
  ".github/workflows",
  "AGENTS.md",
  "ARCHITECTURE.md",
  "README"
];

function isCommandSurface(file) {
  const lower = file.toLowerCase();
  if (lower.startsWith("docs/")) return false;
  if (lower.endsWith(".md") || lower.endsWith(".txt")) return false;
  if (lower.endsWith(".js")) return true;
  if (lower.endsWith(".ts")) return true;
  if (lower.endsWith(".mjs")) return true;
  if (lower.endsWith(".cjs")) return true;
  if (lower.endsWith(".sh")) return true;
  if (lower.endsWith(".ps1")) return true;
  if (lower.endsWith(".yml")) return true;
  if (lower.endsWith(".yaml")) return true;
  if (lower.endsWith(".json")) return true;
  if (lower.includes(".github/workflows/")) return true;
  return false;
}

function isPromptSurface(file) {
  const lower = file.toLowerCase();
  if (lower.startsWith(".git/")) return false;
  return lower.endsWith(".md") || lower.endsWith(".txt") || isCommandSurface(file);
}

function runGit(args, allowFailure = false) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    if (allowFailure) return "";
    throw error;
  }
}

function parseArgs(argv) {
  const options = {
    strict: false,
    range: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--strict") {
      options.strict = true;
      continue;
    }
    if (arg === "--range") {
      options.range = argv[i + 1] || null;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parseEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return null;
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(eventPath);
  } catch {
    return null;
  }
}

function autoRange() {
  const payload = parseEventPayload();
  if (payload && payload.pull_request) {
    const baseSha = payload.pull_request.base && payload.pull_request.base.sha;
    const headSha = payload.pull_request.head && payload.pull_request.head.sha;
    if (baseSha && headSha) return `${baseSha}...${headSha}`;
  }

  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    runGit(["fetch", "--no-tags", "--depth=50", "origin", baseRef], true);
    return `origin/${baseRef}...HEAD`;
  }

  const workingTreeDiff = runGit(["diff", "--name-only", "HEAD"], true);
  if (workingTreeDiff) return "HEAD";

  const hasHead = runGit(["rev-parse", "--verify", "HEAD"], true);
  const hasParent = runGit(["rev-parse", "--verify", "HEAD~1"], true);
  if (hasHead && hasParent) return "HEAD~1...HEAD";
  if (hasHead) return "HEAD";

  return null;
}

function parseDiffAddedLines(diffText) {
  const out = [];
  let currentFile = null;

  const lines = diffText.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice("+++ b/".length).trim();
      continue;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    if (!currentFile) continue;
    out.push({ file: currentFile, text: line.slice(1) });
  }

  return out;
}

async function exists(relPath) {
  try {
    await fs.access(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

async function walk(relPath) {
  const full = path.join(ROOT, relPath);
  const stat = await fs.stat(full);
  if (stat.isFile()) return [relPath.replace(/\\/g, "/")];

  const out = [];
  const entries = await fs.readdir(full, { withFileTypes: true });
  for (const entry of entries) {
    const entryRel = path.join(relPath, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      out.push(...(await walk(entryRel)));
      continue;
    }
    if (entry.isFile()) out.push(entryRel);
  }
  return out;
}

async function collectScanLines(range) {
  if (range) {
    const diff = runGit(["diff", "--unified=0", "--no-color", range], true);
    const parsed = parseDiffAddedLines(diff);
    if (parsed.length > 0) return parsed;
  }

  const lines = [];
  for (const relPath of CHECK_PATHS) {
    if (!(await exists(relPath))) continue;
    const files = await walk(relPath);
    for (const file of files) {
      const text = await fs.readFile(path.join(ROOT, file), "utf8");
      for (const line of text.split(/\r?\n/)) {
        lines.push({ file, text: line });
      }
    }
  }
  return lines;
}

function matchAny(line, patterns) {
  return patterns.some((pattern) => pattern.test(line));
}

function sectionText(body, headingRegex) {
  if (!body) return "";
  const lines = body.split(/\r?\n/);
  let collect = false;
  const out = [];

  for (const line of lines) {
    const isHeading = /^\s*##\s+/.test(line);
    if (!collect && headingRegex.test(line)) {
      collect = true;
      continue;
    }
    if (collect && isHeading) break;
    if (collect) out.push(line);
  }

  return out.join("\n");
}

function extractApprovers(text) {
  if (!text) return new Set();
  const matches = text.match(/@[A-Za-z0-9_-]+/g) || [];
  return new Set(matches.map((m) => m.toLowerCase()));
}

function getApprovalContext() {
  const payload = parseEventPayload();
  const prBody = payload && payload.pull_request ? payload.pull_request.body || "" : process.env.PR_BODY || "";

  const installEnv = process.env.SECURITY_INSTALL_APPROVALS || "";
  const destructiveEnv = process.env.SECURITY_DESTRUCTIVE_APPROVALS || "";

  const installSection = sectionText(prBody, /^\s*##\s+Security Approvals/i);
  const destructiveSection = sectionText(prBody, /^\s*##\s+Destructive Checklist/i);

  const installApprovers = new Set([
    ...extractApprovers(installSection),
    ...extractApprovers(installEnv)
  ]);
  const destructiveApprovers = new Set([
    ...extractApprovers(installSection),
    ...extractApprovers(destructiveEnv)
  ]);

  const checklist = {
    rollback: /rollback/i.test(destructiveSection),
    scope: /scope/i.test(destructiveSection),
    validation: /validation/i.test(destructiveSection)
  };

  return {
    installApprovers,
    destructiveApprovers,
    checklist,
    hasPrBody: Boolean(prBody && prBody.trim())
  };
}

async function checkSecurityPolicyDoc(errors) {
  const securityPath = path.join(ROOT, "docs/SECURITY.md");
  const text = await fs.readFile(securityPath, "utf8");

  const requiredSnippets = [
    "two explicit human approvals",
    "Do not install any new skill without prior approval.",
    "Do not install skills or plugins unless two approvals are already documented.",
    "Destructive Command Policy",
    "Prompt Injection Defense"
  ];

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      errors.push(`docs/SECURITY.md is missing required policy text: "${snippet}"`);
    }
  }
}

function formatFinding(title, findings) {
  const lines = findings.slice(0, 10).map((f) => `- ${f.file}: ${f.text.trim()}`);
  const extra = findings.length > 10 ? `\n- ... and ${findings.length - 10} more` : "";
  return `${title}\n${lines.join("\n")}${extra}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const errors = [];
  const warnings = [];

  await checkSecurityPolicyDoc(errors);

  const range = options.range || autoRange();
  const scanLines = await collectScanLines(range);
  const approval = getApprovalContext();

  const installHits = [];
  const destructiveHits = [];
  const promptHits = [];

  for (const line of scanLines) {
    const text = line.text || "";
    if (!text.trim()) continue;
    if (text.includes(ALLOW_TOKEN)) continue;

    if (isCommandSurface(line.file) && matchAny(text, INSTALL_PATTERNS)) installHits.push(line);
    if (isCommandSurface(line.file) && matchAny(text, DESTRUCTIVE_PATTERNS)) destructiveHits.push(line);
    if (isPromptSurface(line.file) && matchAny(text, PROMPT_INJECTION_PATTERNS)) promptHits.push(line);
  }

  if (installHits.length > 0 && approval.installApprovers.size < 2) {
    errors.push(
      `${formatFinding("Install-related commands detected without two approvals.", installHits)}\n` +
        "Remediation: add at least two approvers in PR section 'Security Approvals' or set SECURITY_INSTALL_APPROVALS."
    );
  }

  if (destructiveHits.length > 0) {
    if (approval.destructiveApprovers.size < 2) {
      errors.push(
        `${formatFinding("Destructive commands detected without two approvals.", destructiveHits)}\n` +
          "Remediation: add at least two approvers in PR section 'Security Approvals' or set SECURITY_DESTRUCTIVE_APPROVALS."
      );
    } else if (!approval.checklist.rollback || !approval.checklist.scope || !approval.checklist.validation) {
      errors.push(
        "Destructive commands detected but destructive checklist is incomplete. " +
          "Required terms in PR 'Destructive Checklist' section: rollback, scope, validation."
      );
    }
  }

  if (promptHits.length > 0) {
    warnings.push(
      `${formatFinding("Possible prompt injection strings detected.", promptHits)}\n` +
        "Remediation: sanitize/strip untrusted instructions and document why the text is safe."
    );
  }

  if (!approval.hasPrBody && (installHits.length > 0 || destructiveHits.length > 0)) {
    warnings.push(
      "No PR body detected in environment; approval checks rely on SECURITY_INSTALL_APPROVALS/SECURITY_DESTRUCTIVE_APPROVALS env vars."
    );
  }

  console.log("Security Preflight Report");
  console.log(`- Scan scope lines: ${scanLines.length}`);
  console.log(`- Install hits: ${installHits.length}`);
  console.log(`- Destructive hits: ${destructiveHits.length}`);
  console.log(`- Prompt-injection hits: ${promptHits.length}`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`\n${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error("\nErrors:");
    for (const error of errors) {
      console.error(`\n${error}`);
    }
    process.exit(1);
  }

  if (options.strict && warnings.length > 0) {
    process.exit(1);
  }

  console.log("\nSecurity preflight checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
