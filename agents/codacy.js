'use strict';
// STUB — Codacy real agent deferred. See docs for reason.
const fs   = require('fs');
const path = require('path');
const logger        = require('../logger');
const statusManager = require('../statusManager');

async function run(repoPath, reportsDir) {
  statusManager.setRunning('codacy');
  logger.info('codacy — stub running');

  const dummy = {
    data: [
      {
        issueId    : 'cd-001',
        filePath   : 'demo_login.js',
        lineNumber : 12,
        message    : 'SQL query built from user input without sanitisation',
        patternInfo: { patternId: 'sql-injection', level: 'High' }
      },
      {
        issueId    : 'cd-002',
        filePath   : 'demo_search.js',
        lineNumber : 27,
        message    : 'eval() called with user-controlled data — code injection',
        patternInfo: { patternId: 'no-eval', level: 'High' }
      },
      {
        issueId    : 'cd-003',
        filePath   : 'demo_helper.js',
        lineNumber : 55,
        message    : 'Empty catch block hides errors from caller',
        patternInfo: { patternId: 'no-empty-catch', level: 'Medium' }
      },
      {
        issueId    : 'cd-004',
        filePath   : 'demo_helper.js',
        lineNumber : 78,
        message    : 'Variable declared but never used — dead code',
        patternInfo: { patternId: 'no-unused-vars', level: 'Low' }
      }
    ]
  };

  fs.writeFileSync(
    path.join(reportsDir, 'codacy-report.json'),
    JSON.stringify(dummy, null, 2)
  );
  statusManager.setDone('codacy', dummy.data.length);
  logger.info(`codacy — stub done | findings: ${dummy.data.length}`);
}

module.exports = { run };