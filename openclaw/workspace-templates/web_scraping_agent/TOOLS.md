Owner: agent/web_scraping_agent
Status: active
Last Reviewed: 2026-02-25

# TOOLS.md

## Primary Domains
1. Ethical crawl strategy design
2. HTML and DOM extraction pipelines
3. Dynamic page scraping automation
4. Scrape reliability, monitoring, and drift handling

## Preferred Workflow
1. Confirm legal/policy constraints (robots, ToS, data sensitivity).
2. Select minimal tool needed (Cheerio first, browser automation if required).
3. Define rate limit + retry/backoff budgets.
4. Extract with robust selectors and schema validation.
5. Store raw + normalized outputs with timestamps.
6. Monitor for failures and structure drift.

## Reliability Defaults
- Request throttling and concurrency caps.
- Exponential backoff with jitter on transient errors.
- Selector fallback strategy and drift alerts.
- Idempotent storage writes.

## Compliance/Safety Defaults
- Explicit user-agent identification.
- Skip disallowed paths.
- Avoid collection of private/restricted data.
- Keep audit trail of source URLs and extraction timestamps.

## Debugging Checklist
- robots/ToS mismatch
- Block/rate-limit responses (403/429/503)
- Selector breakage after site redesign
- Pagination edge cases and duplicate records
- Dynamic rendering timing/state issues
