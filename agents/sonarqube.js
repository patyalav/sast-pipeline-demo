'use strict';
// STUB — SonarQube real agent deferred. See docs for reason.
const fs   = require('fs');
const path = require('path');
const logger        = require('../logger');
const statusManager = require('../statusManager');

async function run(repoPath, reportsDir) {
  statusManager.setRunning('sonarqube');
  logger.info('sonarqube — stub running');

  const dummy = {
    issues: [
      {
        key      : 'sq-001',
        component: 'demo_login.js',
        line     : 12,
        rule     : 'javascript:S2077',
        severity : 'BLOCKER',
        message  : 'SQL query constructed from user input — SQL Injection risk'
      },
      {
        key      : 'sq-002',
        component: 'demo_database.js',
        line     : 10,
        rule     : 'javascript:S2068',
        severity : 'CRITICAL',
        message  : 'Hardcoded database password detected in source code'
      },
      {
        key      : 'sq-003',
        component: 'demo_helper.js',
        line     : 10,
        rule     : 'javascript:S3776',
        severity : 'MAJOR',
        message  : 'Cognitive complexity of 15 exceeds allowed maximum of 10'
      },
      {
        key      : 'sq-004',
        component: 'demo_helper.js',
        line     : 78,
        rule     : 'javascript:S1481',
        severity : 'MINOR',
        message  : 'Unused variable — unusedVariable is declared but never used'
      }
    ]
  };

  fs.writeFileSync(
    path.join(reportsDir, 'sonarqube-report.json'),
    JSON.stringify(dummy, null, 2)
  );
  statusManager.setDone('sonarqube', dummy.issues.length);
  logger.info(`sonarqube — stub done | findings: ${dummy.issues.length}`);
}

module.exports = { run };