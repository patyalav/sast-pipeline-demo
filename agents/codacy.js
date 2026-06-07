'use strict';
// TEMPORARY STUB — will be replaced in Phase 3
const fs   = require('fs');
const path = require('path');
const logger        = require('../logger');
const statusManager = require('../statusManager');

async function run(repoPath, reportsDir) {
  statusManager.setRunning('codacy');
  logger.info('codacy — stub running');

  const dummy = {
    data: [
      { issueId: 'cd-001', filePath: 'src/utils.js',   lineNumber: 8,  message: 'Missing error handling',      patternInfo: { patternId: 'no-empty-catch',    level: 'High'   } },
      { issueId: 'cd-002', filePath: 'src/auth.js',    lineNumber: 34, message: 'Insecure random number usage', patternInfo: { patternId: 'insecure-random',   level: 'High'   } },
      { issueId: 'cd-003', filePath: 'src/product.js', lineNumber: 19, message: 'Complex function detected',    patternInfo: { patternId: 'complexity',        level: 'Medium' } }
    ]
  };

  fs.writeFileSync(path.join(reportsDir, 'codacy-report.json'), JSON.stringify(dummy, null, 2));
  statusManager.setDone('codacy', dummy.data.length);
  logger.info(`codacy — stub done | findings: ${dummy.data.length}`);
}

module.exports = { run };
