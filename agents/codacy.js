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
      { issueId: 'cd-001', filePath: 'routes/login.js',      lineNumber: 12,  message: 'SQL query built from user input without sanitisation',         patternInfo: { patternId: 'sql-injection',       level: 'High'   } },
      { issueId: 'cd-002', filePath: 'routes/search.js',     lineNumber: 16,  message: 'Unsanitised user input written directly to HTTP response',      patternInfo: { patternId: 'xss-direct-write',    level: 'High'   } },
      { issueId: 'cd-003', filePath: 'routes/search.js',     lineNumber: 27,  message: 'eval() called with user-controlled data — code injection',      patternInfo: { patternId: 'no-eval',             level: 'High'   } },
      { issueId: 'cd-004', filePath: 'utils/crypto.js',      lineNumber: 14,  message: 'Math.random() used for security token — not cryptographically secure', patternInfo: { patternId: 'insecure-random',  level: 'High'   } },
      { issueId: 'cd-005', filePath: 'utils/crypto.js',      lineNumber: 20,  message: 'MD5 used for password hashing — easily cracked',                patternInfo: { patternId: 'weak-hash',           level: 'High'   } },
      { issueId: 'cd-006', filePath: 'utils/fileHandler.js', lineNumber: 14,  message: 'User input used in file path without validation',               patternInfo: { patternId: 'path-traversal',      level: 'High'   } },
      { issueId: 'cd-007', filePath: 'config/database.js',   lineNumber: 10,  message: 'Hardcoded password found in source code',                       patternInfo: { patternId: 'hardcoded-password',  level: 'High'   } },
      { issueId: 'cd-008', filePath: 'utils/helper.js',      lineNumber: 10,  message: 'Function has cognitive complexity of 15 — exceeds maximum of 10', patternInfo: { patternId: 'complexity',          level: 'Medium' } },
      { issueId: 'cd-009', filePath: 'utils/helper.js',      lineNumber: 55,  message: 'Empty catch block hides errors from caller',                    patternInfo: { patternId: 'no-empty-catch',      level: 'Medium' } },
      { issueId: 'cd-010', filePath: 'utils/helper.js',      lineNumber: 63,  message: 'Empty catch block hides connection errors',                     patternInfo: { patternId: 'no-empty-catch',      level: 'Medium' } },
      { issueId: 'cd-011', filePath: 'utils/helper.js',      lineNumber: 78,  message: 'Variable declared but never used — dead code',                  patternInfo: { patternId: 'no-unused-vars',      level: 'Low'    } },
      { issueId: 'cd-012', filePath: 'utils/helper.js',      lineNumber: 79,  message: 'Variable declared but never used — dead code',                  patternInfo: { patternId: 'no-unused-vars',      level: 'Low'    } },
      { issueId: 'cd-013', filePath: 'utils/helper.js',      lineNumber: 88,  message: 'Duplicate function — validateEmail2 is identical to validateEmail1', patternInfo: { patternId: 'no-duplicate-code', level: 'Low'  } },
      { issueId: 'cd-014', filePath: 'config/database.js',   lineNumber: 38,  message: 'console.log used in production code — use a proper logger',     patternInfo: { patternId: 'no-console',          level: 'Low'    } }
    ]
  };

  fs.writeFileSync(path.join(reportsDir, 'codacy-report.json'), JSON.stringify(dummy, null, 2));
  statusManager.setDone('codacy', dummy.data.length);
  logger.info(`codacy — stub done | findings: ${dummy.data.length}`);
}

module.exports = { run };