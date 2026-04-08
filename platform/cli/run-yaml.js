#!/usr/bin/env node

/**
 * PHASE 4 LOCK
 * 
 * YAML is allowed only as an internal intermediate artifact:
 *   TXT DSL → intent spec YAML → execution
 *
 * Direct YAML → execution is NOT allowed.
 */

console.error('Direct YAML execution disabled. Use TXT DSL pipeline.');
process.exit(1);