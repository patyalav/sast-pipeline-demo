'use strict';
// TEMPORARY STUB — will be replaced in Phase 3
const fs   = require('fs');
const path = require('path');
const logger        = require('../logger');
const statusManager = require('../statusManager');

async function run(repoPath, reportsDir) {
  statusManager.setRunning('gitleaks');
  logger.info('gitleaks — stub running');

  const dummy = [
    { Fingerprint: 'abc123', File: 'config/database.js', StartLine: 12, RuleID: 'generic-api-key' },
    { Fingerprint: 'def456', File: '.env.backup',        StartLine: 3,  RuleID: 'jwt-token' }
  ];

  fs.writeFileSync(path.join(reportsDir, 'gitleaks-report.json'), JSON.stringify(dummy, null, 2));
  statusManager.setDone('gitleaks', dummy.length);
  logger.info(`gitleaks — stub done | findings: ${dummy.length}`);
}

module.exports = { run };
