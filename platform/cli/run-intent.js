#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

async function main() {
  const argv = minimist(process.argv.slice(2));

  const specPath = argv.spec || argv.s;
  const service = argv.service || argv.svc || argv.s;
  const headless = argv.headless !== undefined ? Boolean(argv.headless) : true;

  if (!specPath) {
    console.error('Missing required argument: --spec <intent-spec.yaml>');
    process.exit(1);
  }

  const absoluteSpecPath = path.resolve(specPath);
  if (!fs.existsSync(absoluteSpecPath)) {
    console.error(`Spec file not found: ${absoluteSpecPath}`);
    process.exit(1);
  }

  try {
    const { runIntentSpec } = require('../core/intent-runner');
    await runIntentSpec({
      specPath: absoluteSpecPath,
      service,
      headless,
    });
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}