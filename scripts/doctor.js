const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function ok(message) {
  console.log(`✅ ${message}`);
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function check(condition, message) {
  if (condition) ok(message);
  else fail(message);
}

const rootDir = path.resolve(__dirname, '..');
const envLocalPath = path.join(rootDir, 'config', '.env.local');

check(fs.existsSync(envLocalPath), 'config/.env.local exists (run: npm run bootstrap)');

try {
  const version = execSync('npx playwright --version', { stdio: 'pipe' }).toString().trim();
  ok(`Playwright available: ${version}`);
} catch {
  fail('Playwright is available (run: npm install)');
}

if (process.exitCode) {
  console.log('\nFix issues above, then re-run: npm run doctor');
} else {
  console.log('\n✅ Doctor checks passed');
}