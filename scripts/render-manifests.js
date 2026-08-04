/**
 * MS-54 - Kubernetes Manifest Renderer
 * Renders the College Hub Helm chart into plain manifests committed under
 * infra/k8s/render/<env>/all.yaml for GitOps consumption and offline review.
 *
 * Requires: helm >= 3.12
 * Usage: node scripts/render-manifests.js [env]
 *        node scripts/render-manifests.js           # renders dev, staging, prod
 *        node scripts/render-manifests.js staging    # renders a single environment
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chart = join(root, 'infra', 'helm', 'collegehub');
const outputRoot = join(root, 'infra', 'k8s', 'render');
const environments = process.argv[2] ? [process.argv[2]] : ['dev', 'staging', 'prod'];

let helmBin = 'helm';
if (process.env.HELM_BIN) {
  helmBin = process.env.HELM_BIN;
}

for (const environment of environments) {
  const namespace = `collegehub-${environment}`;
  const valuesFile = join(chart, `values.${environment}.yaml`);

  if (!existsSync(valuesFile)) {
    console.error(`Missing values overlay: ${valuesFile}`);
    process.exit(1);
  }

  const outputDir = join(outputRoot, environment);
  mkdirSync(outputDir, { recursive: true });

  const args = [
    'template',
    'collegehub',
    chart,
    '--namespace',
    namespace,
    '--include-crds',
    '-f',
    valuesFile,
    '--set',
    `global.namespace=${namespace}`
  ];

  let rendered;
  try {
    rendered = execFileSync(helmBin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    console.error(`Helm render failed for environment '${environment}':`);
    console.error(err.stderr || err.message);
    process.exit(1);
  }

  const outputFile = join(outputDir, 'all.yaml');
  writeFileSync(outputFile, rendered);
  console.log(`Rendered ${environment} (${namespace}) -> infra/k8s/render/${environment}/all.yaml`);
}
