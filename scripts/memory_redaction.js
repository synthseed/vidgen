#!/usr/bin/env node

function redact(text) {
  if (!text) return "";
  return String(text)
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[REDACTED_API_KEY]")
    .replace(/(token|password|secret)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[REDACTED_PHONE]");
}

function stripImperatives(text) {
  const banned = /(ignore .*instructions|run\s+command|execute\s+this|disable\s+safety|bypass\s+guard)/i;
  if (banned.test(text)) return "[FLAGGED_UNTRUSTED_CONTENT]";
  return text;
}

if (require.main === module) {
  const input = process.argv.slice(2).join(" ") || "";
  process.stdout.write(stripImperatives(redact(input)));
}

module.exports = { redact, stripImperatives };
