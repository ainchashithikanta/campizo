import { execSync } from 'node:child_process';

console.log('🛑 Stopping College Hub Local Infrastructure Services...');
try {
  execSync('docker compose down', { stdio: 'inherit' });
  console.log('✅ Infrastructure containers stopped successfully.');
} catch (error) {
  console.error('❌ Failed to stop infrastructure containers:', error.message);
  process.exit(1);
}
