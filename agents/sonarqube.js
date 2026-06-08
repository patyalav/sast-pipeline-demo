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
      { key: 'sq-001', component: 'routes/login.js',       line: 12, rule: 'javascript:S2077', severity: 'BLOCKER',  message: 'SQL query constructed from user input — SQL Injection risk' },
      { key: 'sq-002', component: 'utils/crypto.js',       line: 20, rule: 'javascript:S2053', severity: 'CRITICAL', message: 'MD5 used for password hashing — use bcrypt instead' },
      { key: 'sq-003', component: 'utils/crypto.js',       line: 28, rule: 'javascript:S3330', severity: 'CRITICAL', message: 'DES encryption is considered broken — use AES-256' },
      { key: 'sq-004', component: 'routes/search.js',      line: 27, rule: 'javascript:S1523', severity: 'BLOCKER',  message: 'eval() used with user-controlled input — code injection risk' },
      { key: 'sq-005', component: 'utils/fileHandler.js',  line: 14, rule: 'javascript:S2083', severity: 'CRITICAL', message: 'Path traversal — user input used in file path without validation' },
      { key: 'sq-006', component: 'utils/helper.js',       line: 10, rule: 'javascript:S3776', severity: 'MAJOR',    message: 'Cognitive complexity of 15 exceeds allowed maximum of 10' },
      { key: 'sq-007', component: 'utils/helper.js',       line: 55, rule: 'javascript:S1186', severity: 'MAJOR',    message: 'Empty catch block — exception silently swallowed' },
      { key: 'sq-008', component: 'config/database.js',    line: 10, rule: 'javascript:S2068', severity: 'BLOCKER',  message: 'Hardcoded database password detected in source code' },
      { key: 'sq-009', component: 'utils/helper.js',       line: 78, rule: 'javascript:S1481', severity: 'MINOR',    message: 'Unused variable — unusedVariable is declared but never used' },
      { key: 'sq-010', component: 'utils/helper.js',       line: 79, rule: 'javascript:S1481', severity: 'MINOR',    message: 'Unused variable — anotherUnused is declared but never used' },
      { key: 'sq-011', component: 'config/database.js',    line: 38, rule: 'javascript:S1135', severity: 'MINOR',    message: 'Debug mode hardcoded to true — should be environment controlled' },
      { key: 'sq-012', component: 'routes/login.js',       line: 28, rule: 'javascript:S1166', severity: 'MAJOR',    message: 'Empty catch block — error silently ignored in admin route' }
    ]
  };

  fs.writeFileSync(path.join(reportsDir, 'sonarqube-report.json'), JSON.stringify(dummy, null, 2));
  statusManager.setDone('sonarqube', dummy.issues.length);
  logger.info(`sonarqube — stub done | findings: ${dummy.issues.length}`);
}

module.exports = { run };