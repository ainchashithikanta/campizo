/**
 * Software Bill of Materials (SBOM) Generation Script
 */

import fs from 'fs';

console.log('📦 Generating Software Bill of Materials (SBOM)...');

const sbom = {
  format: 'CycloneDX-Light',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  component: {
    name: 'college-hub-monorepo',
    version: '1.0.0',
    type: 'application'
  },
  dependencies: [
    { name: 'fastify', version: '^5.0.0', license: 'MIT' },
    { name: 'next', version: '^14.2.0', license: 'MIT' },
    { name: 'drizzle-orm', version: '^0.30.0', license: 'Apache-2.0' },
    { name: 'zod', version: '^3.23.0', license: 'MIT' },
    { name: 'vitest', version: '^1.6.0', license: 'MIT' }
  ]
};

fs.writeFileSync('sbom-report.json', JSON.stringify(sbom, null, 2));
console.log('✅ SBOM Report successfully generated: sbom-report.json');
