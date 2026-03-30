const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { resolveFromRoot } = require('./workspace-root');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadYamlIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = yaml.load(content);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function dumpYaml(obj) {
  return yaml.dump(obj, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Merge-write a single target entry into the service registry file.
 *
 * File: locator-registry/services/<service>/<feature>.yaml
 */
async function writeServiceRegistryEntry({ service, feature, targetKey, entry }) {
  if (!service) throw new Error('writeServiceRegistryEntry: missing service');
  if (!feature) throw new Error('writeServiceRegistryEntry: missing feature');
  if (!targetKey) throw new Error('writeServiceRegistryEntry: missing targetKey');
  if (!entry) throw new Error('writeServiceRegistryEntry: missing entry');

  const registryDir = resolveFromRoot('locator-registry', 'services', service);
  ensureDirExists(registryDir);

  const registryPath = path.join(registryDir, `${feature}.yaml`);
  const existing = loadYamlIfExists(registryPath);

  // Merge strategy: overwrite the specific target key (idempotent grounding).
  // If later you want “only replace when better”, we can add that as an option.
  const merged = {
    ...existing,
    [targetKey]: entry,
  };

  fs.writeFileSync(registryPath, dumpYaml(merged), 'utf8');
  return registryPath;
}

module.exports = {
  writeServiceRegistryEntry,
};