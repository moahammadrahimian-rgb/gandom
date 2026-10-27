#!/bin/bash
termux-wake-lock
ulimit -v 204800
export NODE_OPTIONS="--max-old-space-size=64"
node ~/gandom/GANDOM-ORCHESTRATOR.js
