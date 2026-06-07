/**
 * gitleaks.js
 * Runs Gitleaks CLI against the cloned repository and saves findings as JSON.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — execute Gitleaks and write gitleaks-report.json.
 * It does NOT: parse results, combine reports, or manage other tools.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * run(repoPath, reportsDir)
 * → Returns: void (updates statusManager directly)
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   repoPath + reportsDir received
 *         ↓
 *   statusManager → running
 *         ↓
 *   Build gitleaks CLI command
 *         ↓
 *   Execute CLI — output written to gitleaks-report.json
 *         ↓
 *   Gitleaks exit code:
 *   → 0  = no findings    → read file, setDone(0)
 *   → 1  = findings found → read file, setDone(count)
 *   → other = real error  → setFailed
 *         ↓
 *   Return
 *
 *   ── Error scenarios ──
 *   Gitleaks not in PATH     → setFailed
 *   repoPath does not exist  → setFailed
 *   Report file not written  → setFailed
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const { exec } = require('child_process');
const util    = require('util');
const execAsync = util.promisify(exec);

const logger        = require('../logger');
const statusManager = require('../statusManager');

/**
 * run
 * Executes Gitleaks against the cloned repo and writes findings to JSON.
 *
 * @param {string} repoPath   - Absolute path to the cloned repository
 * @param {string} reportsDir - Absolute path to the timestamped reports folder
 * @returns {Promise<void>}
 */
async function run(repoPath, reportsDir) {
  statusManager.setRunning('gitleaks');
  logger.info('Gitleaks — starting scan');

  const reportFile = path.join(reportsDir, 'gitleaks-report.json');

  // ── Build CLI command ─────────────────────────────────────────────────────
  // detect   — scan mode for local directories
  // --source — path to scan
  // --report-format json — output as JSON
  // --report-path — where to write the JSON file
  // --no-git — scan all files, not just git history
  // --exit-code 0 — always exit 0 so we can handle findings ourselves
  const cmd = `gitleaks detect --source "${repoPath}" --report-format json --report-path "${reportFile}" --no-git --exit-code 0`;

  logger.info(`Gitleaks — command: ${cmd}`);

  try {
    await execAsync(cmd);

    // ── Read and parse report ───────────────────────────────────────────────
    if (!fs.existsSync(reportFile)) {
      // No findings — gitleaks writes nothing when clean with --exit-code 0
      logger.info('Gitleaks — no findings, writing empty report');
      fs.writeFileSync(reportFile, JSON.stringify([], null, 2));
      statusManager.setDone('gitleaks', 0);
      return;
    }

    const raw      = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const findings = Array.isArray(raw) ? raw : [];
    statusManager.setDone('gitleaks', findings.length);
    logger.info(`Gitleaks — scan complete | findings: ${findings.length}`);

  } catch (err) {
    logger.error(`Gitleaks — scan failed | ${err.message}`);
    statusManager.setFailed('gitleaks', err.message);
  }
}

module.exports = { run };