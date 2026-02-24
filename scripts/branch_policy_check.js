#!/usr/bin/env node

function fail(msg) {
  console.error(`Branch policy check failed: ${msg}`);
  process.exit(1);
}

const event = process.env.GITHUB_EVENT_NAME || "";
const baseRef = process.env.GITHUB_BASE_REF || "";
const headRef = process.env.GITHUB_HEAD_REF || "";

if (event !== "pull_request") {
  console.log(`Branch policy check skipped for event=${event || "unknown"}`);
  process.exit(0);
}

if (baseRef !== "main") {
  console.log(`Branch policy check skipped for base=${baseRef || "unknown"}`);
  process.exit(0);
}

if (headRef !== "dev") {
  fail(`PRs targeting main must come from dev (got head=${headRef || "unknown"})`);
}

console.log("Branch policy check passed: dev -> main PR");
