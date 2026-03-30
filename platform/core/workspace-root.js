const path = require('path');

/**
 * Workspace root resolver for parent/child repo installs.
 *
 * When this project is consumed as a dependency (e.g. installed under node_modules),
 * we still want all generated artifacts and configs to resolve relative to the
 * CHILD repo (the workspace), not the dependency directory.
 *
 * Resolution order:
 * 1) process.env.AUTOMATION_ROOT (set by CLI --workspace-root)
 * 2) process.env.WORKSPACE_ROOT (alias)
 * 3) process.cwd() (backwards compatible default)
 */
function getWorkspaceRoot() {
  const explicit = process.env.AUTOMATION_ROOT || process.env.WORKSPACE_ROOT;
  const base = explicit && String(explicit).trim() ? explicit : process.cwd();
  return path.resolve(base);
}

function resolveFromRoot(...parts) {
  return path.join(getWorkspaceRoot(), ...parts);
}

module.exports = {
  getWorkspaceRoot,
  resolveFromRoot,
};