import { execSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
const envExamplePath = resolve(process.cwd(), '.env.example');

if (!existsSync(envPath)) {
  console.log('⚠️ .env not found. Copying from .env.example...');
  copyFileSync(envExamplePath, envPath);
}

console.log('🚀 Booting College Hub Local Infrastructure Services...');
try {
  execSync('docker compose up -d postgres redis minio mailpit', { stdio: 'inherit' });
  console.log('✅ Infrastructure containers launched successfully!');
  console.log('📊 Run `pnpm db:status` to inspect health checks.');
} catch (error) {
  console.error('❌ Failed to launch infrastructure containers:', error.message);
  process.exit(1);
}
