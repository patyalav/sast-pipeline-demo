'use strict';
// TEMPORARY STUB — will be replaced in Phase 3
const fs   = require('fs');
const path = require('path');
const logger        = require('../logger');
const statusManager = require('../statusManager');

async function run(repoPath, reportsDir) {
  statusManager.setRunning('semgrep');
  logger.info('semgrep — stub running');

  const dummy = {
    results: [
      { check_id: 'javascript.sqli', path: 'routes/user.js',    start: { line: 42 }, extra: { severity: 'ERROR',   message: 'SQL Injection risk' } },
      { check_id: 'javascript.xss',  path: 'routes/product.js', start: { line: 18 }, extra: { severity: 'WARNING', message: 'XSS vulnerability' } }
    ]
  };

  fs.writeFileSync(path.join(reportsDir, 'semgrep-report.json'), JSON.stringify(dummy, null, 2));
  statusManager.setDone('semgrep', dummy.results.length);
  logger.info(`semgrep — stub done | findings: ${dummy.results.length}`);
}

module.exports = { run };
