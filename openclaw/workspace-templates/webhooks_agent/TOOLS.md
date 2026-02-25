Owner: agent/webhooks_agent
Status: active
Last Reviewed: 2026-02-25

# TOOLS.md

## Core Domains
1. Outbound webhook delivery pipelines
2. Inbound webhook verification handlers
3. Observability and replay/debug tooling
4. Contract/schema versioning

## Preferred Patterns
### Sender
- Durable queue + worker model (not direct inline fire-and-forget)
- Exponential backoff with jitter
- Dead-letter queue for terminal failures
- Delivery attempt logging with correlation IDs

### Receiver
- Fast ACK path (verify -> enqueue -> 200)
- Async downstream processing
- Idempotency keys + duplicate suppression
- Signature verification before parsing business logic

## Security Defaults
- HMAC SHA-256 signature headers
- Timestamp header with tight replay window
- HTTPS only
- Secret rotation support and key versioning

## Debuggability
- Per-delivery timeline (queued, sent, retried, succeeded, failed)
- Payload/body redaction rules for sensitive fields
- Manual replay/testing tools
- Contract test fixtures for versioned webhook payloads
