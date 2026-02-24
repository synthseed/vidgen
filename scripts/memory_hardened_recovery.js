#!/usr/bin/env node

const { spawnSync } = require('child_process');

const result = spawnSync('node', ['scripts/memory_hardened_observer.js'], { stdio: 'inherit', env: process.env });
if (result.status !== 0) process.exit(result.status || 1);
console.log('hardened memory recovery complete');
