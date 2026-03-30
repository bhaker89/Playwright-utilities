const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { resolveFromRoot } = require('./workspace-root');

function loadYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function loadServiceRegistry(service, feature) {
  if (!service || !feature) {
    return null;
  }

  const registryPath = resolveFromRoot(
    'locator-registry',
    'services',
    service,
    `${feature}.yaml`
  );

  return loadYaml(registryPath);
}

function loadGlobalRegistry(feature) {
  const registryPath = resolveFromRoot(
    'locator-registry',
    'global',
    `${feature}.yaml`
  );

  return loadYaml(registryPath);
}

module.exports = {
  loadServiceRegistry,
  loadGlobalRegistry,
};