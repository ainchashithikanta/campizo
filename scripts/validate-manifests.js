/**
 * MS-54 - Rendered Manifest Validator
 * Sanity-checks the Helm-rendered manifests under infra/k8s/render/<env>/all.yaml
 * without requiring a live cluster. Full schema validation happens in CI
 * (helm lint + kubeconform against the rendered output).
 *
 * Usage: node scripts/validate-manifests.js [env]
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const renderRoot = join(root, 'infra', 'k8s', 'render');
const environments = process.argv[2] ? [process.argv[2]] : ['dev', 'staging', 'prod'];

const EXPECTED = {
  dev: ['Namespace', 'ServiceAccount', 'ConfigMap', 'Secret', 'Deployment', 'StatefulSet', 'Job', 'PersistentVolumeClaim'],
  staging: ['Namespace', 'ServiceAccount', 'ConfigMap', 'Secret', 'Deployment', 'Service', 'HorizontalPodAutoscaler', 'PodDisruptionBudget', 'Ingress', 'NetworkPolicy', 'Job'],
  prod: ['Namespace', 'ServiceAccount', 'ConfigMap', 'Secret', 'Deployment', 'Service', 'HorizontalPodAutoscaler', 'PodDisruptionBudget', 'Ingress', 'NetworkPolicy', 'Job']
};

let failed = false;

for (const environment of environments) {
  const file = join(renderRoot, environment, 'all.yaml');

  if (!existsSync(file)) {
    console.error(`FAIL: rendered manifest missing for '${environment}': ${file}`);
    failed = true;
    continue;
  }

  const content = readFileSync(file, 'utf8');
  const kinds = new Set([...content.matchAll(/^kind:\s*(\S+)/gm)].map((m) => m[1]));
  const missing = EXPECTED[environment].filter((kind) => !kinds.has(kind));

  if (missing.length > 0) {
    console.error(`FAIL: '${environment}' is missing expected resource kinds: ${missing.join(', ')}`);
    failed = true;
    continue;
  }

  if (content.includes('changeme-postgres-password') || content.includes('changeme-redis-password')) {
    console.error(`FAIL: '${environment}' still contains placeholder secret values.`);
    failed = true;
    continue;
  }

  console.log(`OK: ${environment} (${[...kinds].length} resource kinds)`);
}

if (failed) {
  process.exit(1);
}
console.log('All rendered manifests passed validation.');
