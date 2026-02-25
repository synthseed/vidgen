#!/usr/bin/env node

const assert = require('node:assert/strict');
const { normalizeRange, normalizeResolution } = require('../lib/metrics.ts');

assert.equal(normalizeRange('24h'), '24h');
assert.equal(normalizeRange('garbage'), '24h');
assert.equal(normalizeResolution('auto', '30d'), '1d');
assert.equal(normalizeResolution('auto', '24h'), '5m');
assert.equal(normalizeResolution('1h', '24h'), '1h');

console.log('smoke_metrics: ok');
