import { execSync } from 'node:child_process';

console.log('🔍 Checking College Hub Container Health Status...\n');
try {
  execSync('docker compose ps', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to check container status:', error.message);
  process.exit(1);
}
