#!/usr/bin/env node
/**
 * Creates or syncs the schema of the isolated demo database, never the development one.
 * Target: DEMO_DATABASE_URL, default file:./demo.db. Delegates to db-sync.js (pass --apply to upgrade).
 */
const path = require('path');
const url = process.env.DEMO_DATABASE_URL || 'file:./demo.db';
if (url.startsWith('file:') && /^dev\.db$/i.test(path.basename(url.slice(5).split('?')[0]))) {
  console.error('Refusing to touch dev.db: DEMO_DATABASE_URL must point to a separate demo database.');
  process.exit(1);
}
process.env.DATABASE_URL = url;
require('./db-sync.js');
