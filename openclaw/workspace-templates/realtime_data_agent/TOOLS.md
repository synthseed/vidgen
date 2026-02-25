Owner: agent/realtime_data_agent
Status: active
Last Reviewed: 2026-02-25

# TOOLS.md

## Primary Domains
1. Real-time transport protocols (WebSocket, SSE, fallback polling)
2. Event distribution architecture (pub/sub, queue fanout)
3. Connection lifecycle and client resilience
4. Performance and capacity tuning for live systems

## Preferred Implementation Patterns
- Start simple: SSE for one-way live updates; WebSockets for bidirectional interactivity.
- Use Redis pub/sub adapter when scaling real-time nodes.
- Add explicit event contracts and versioned message schemas.
- Track delivery/latency/failure metrics per stream/channel.

## Reliability Defaults
- Reconnect with exponential backoff + jitter.
- Heartbeats and stale-connection detection.
- Optional ACK workflow for critical events.
- Idempotent consumer behavior for duplicate deliveries.

## Performance Defaults
- Batch high-frequency events where UX tolerates it.
- Use compact payloads and compression.
- Enforce per-connection and global rate limits.
- Protect hot channels with backpressure/circuit breakers.

## Operational Debugging Checklist
- Connection counts and churn rate
- Broadcast fanout latency
- Dropped/late message rates
- Redis/pubsub health
- Client reconnect storms after deploy/restart
