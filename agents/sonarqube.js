'use strict';
// TEMPORARY STUB — will be replaced in Phase 3
const fs   = require('fs');
const path = require('path');
const logger        = require('../logger');
const statusManager = require('../statusManager');

async function run(repoPath, reportsDir) {
  statusManager.setRunning('sonarqube');
  logger.info('sonarqube — stub running');

  const dummy = {
    issues: [
      { key: 'sq-001', component: 'src/app.js',      line: 55, rule: 'javascript:S3776', severity: 'BLOCKER',  message: 'Cognitive complexity too high' },
      { key: 'sq-002', component: 'src/payment.js',  line: 23, rule: 'javascript:S2068', severity: 'CRITICAL', message: 'Hardcoded credentials detected' },
      { key: 'sq-003', component: 'src/product.js',  line: 10, rule: 'javascript:S1481', severity: 'MAJOR',    message: 'Unused variable declared' }
    ]
  };

  fs.writeFileSync(path.join(reportsDir, 'sonarqube-report.json'), JSON.stringify(dummy, null, 2));
  statusManager.setDone('sonarqube', dummy.issues.length);
  logger.info(`sonarqube — stub done | findings: ${dummy.issues.length}`);
}

module.exports = { run };
