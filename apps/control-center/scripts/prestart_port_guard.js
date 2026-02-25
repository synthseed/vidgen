#!/usr/bin/env node

const net = require('node:net');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3210);

const socket = net.createConnection({ host, port });

socket.setTimeout(1200);

socket.on('connect', () => {
  console.error(`Port guard: ${host}:${port} already in use; refusing start.`);
  process.exit(1);
});

socket.on('error', () => {
  // expected: ECONNREFUSED means port is free
  process.exit(0);
});

socket.on('timeout', () => {
  console.error(`Port guard: timeout probing ${host}:${port}; refusing start.`);
  process.exit(1);
});
