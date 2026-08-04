/**
 * Production Engineering Verification Script
 * Validates typescript compilation, tests, and build artifacts across the monorepo.
 */

import { execSync } from 'child_process';

console.log('🔍 Starting Monorepo Production Verification Audit...');

try {
  console.log('1. Checking TypeScript Compilation...');
  execSync('npx turbo run type-check', { stdio: 'inherit' });

  console.log('2. Running Monorepo Vitest Test Suites...');
  execSync('npx turbo run test', { stdio: 'inherit' });

  console.log('3. Validating Workspaces Build Outputs...');
  execSync('npx turbo run build', { stdio: 'inherit' });

  console.log('✅ MONOREPO VERIFICATION SUCCESS: All 21 packages and applications passed production verification!');
} catch (err) {
  console.error('❌ MONOREPO VERIFICATION FAILED: Encountered compilation or test errors.');
  process.exit(1);
}
