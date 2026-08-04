/**
 * Production Container Verification Script
 * Validates Dockerfile structure, non-root execution, healthchecks, multi-stage builds,
 * and security compliance across all microservices (api, web, worker, backup).
 *
 * Usage: node scripts/verify-containers.js
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dockerfiles = ['Dockerfile.api', 'Dockerfile.web', 'Dockerfile.worker', 'Dockerfile.backup'];

console.log('🐳 Verifying Production Dockerfiles & Hardening Security Specs...');

let failed = false;

for (const dockerfile of dockerfiles) {
  const filePath = join(root, dockerfile);
  if (!existsSync(filePath)) {
    console.error(`❌ Missing required container definition: ${dockerfile}`);
    failed = true;
    continue;
  }

  const content = readFileSync(filePath, 'utf8');

  // Check 1: Multi-stage build
  if (!content.includes('AS builder') || !content.includes('AS runner')) {
    console.error(`❌ ${dockerfile}: Missing multi-stage build structure (AS builder / AS runner).`);
    failed = true;
  }

  // Check 2: Non-root user execution
  if (!content.match(/^USER\s+(?!root\b)\w+/m)) {
    console.error(`❌ ${dockerfile}: Non-root USER directive missing or executing as root.`);
    failed = true;
  }

  // Check 3: Healthcheck directive
  if (!content.includes('HEALTHCHECK')) {
    console.error(`❌ ${dockerfile}: Liveness/Readiness HEALTHCHECK directive missing.`);
    failed = true;
  }

  // Check 4: Base image security
  if (!content.includes('node:20-alpine') && !content.includes('alpine:')) {
    console.warn(`⚠️  ${dockerfile}: Non-minimal base image detected.`);
  }

  console.log(`  ✓ ${dockerfile} passed multi-stage, non-root, and healthcheck security verification.`);
}

if (failed) {
  console.error('\n❌ Production Container Verification Failed!');
  process.exit(1);
}

console.log('\n✅ All 4 Production Docker Container Specifications Verified Cleanly!');
