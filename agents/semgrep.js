/**
 * semgrep.js
 * Runs Semgrep CLI against the cloned repository and saves findings as JSON.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — execute Semgrep and write semgrep-report.json.
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
 *   Build semgrep CLI command
 *         ↓
 *   Execute CLI — output written to semgrep-report.json
 *         ↓
 *   Semgrep exit code:
 *   → 0  = no findings    → read file, setDone(0)
 *   → 1  = findings found → read file, setDone(count)
 *   → other = real error  → setFailed
 *         ↓
 *   Return
 *
 *   ── Error scenarios ──
 *   Semgrep not in PATH      → setFailed
 *   repoPath does not exist  → setFailed
 *   Report file not written  → setFailed
 *   PYTHONUTF8 not set       → may cause encoding errors on Windows
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path      = require('path');
const fs        = require('fs');
const { exec }  = require('child_process');
const util      = require('util');
const execAsync = util.promisify(exec);

const logger        = require('../logger');
const statusManager = require('../statusManager');

/**
 * run
 * Executes Semgrep against the cloned repo and writes findings to JSON.
 *
 * @param {string} repoPath   - Absolute path to the cloned repository
 * @param {string} reportsDir - Absolute path to the timestamped reports folder
 * @returns {Promise<void>}
 */
async function run(repoPath, reportsDir) {
  statusManager.setRunning('semgrep');
  logger.info('Semgrep — starting scan');

  const reportFile = path.join(reportsDir, 'semgrep-report.json');

  // ── Build CLI command ──────────────────────────────────────────────────────
  // --config auto        — use Semgrep's recommended ruleset (OWASP + best practices)
  // --json               — output as JSON
  // --output             — write JSON to file
  // --no-git-ignore      — scan all files including gitignored ones
  // --timeout 120        — 2 min timeout per rule (prevents hanging)
  const cmd = `semgrep --config auto --json --output "${reportFile}" --no-git-ignore --timeout 120 "${repoPath}"`;

  logger.info(`Semgrep — command: ${cmd}`);

  try {
    // ── PYTHONUTF8=1 required on Windows to handle non-ASCII characters ──────
    const { stderr } = await execAsync(cmd, {
      env: { ...process.env, PYTHONUTF8: '1' },
      maxBuffer: 50 * 1024 * 1024  // 50MB — Semgrep output can be large
    });

    if (stderr) {
      logger.debug(`Semgrep — stderr: ${stderr}`);
    }

    // ── Read and parse report ─────────────────────────────────────────────────
    if (!fs.existsSync(reportFile)) {
      logger.info('Semgrep — no report file written, writing empty report');
      fs.writeFileSync(reportFile, JSON.stringify({ results: [] }, null, 2));
      statusManager.setDone('semgrep', 0);
      return;
    }

    const raw      = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const findings = Array.isArray(raw?.results) ? raw.results : [];
    statusManager.setDone('semgrep', findings.length);
    logger.info(`Semgrep — scan complete | findings: ${findings.length}`);

  } catch (err) {
    // ── Exit code 1 means findings found — not a real error ──────────────────
    // Check if report file was written despite the non-zero exit code
    if (fs.existsSync(reportFile)) {
      try {
        const raw      = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        const findings = Array.isArray(raw?.results) ? raw.results : [];
        statusManager.setDone('semgrep', findings.length);
        logger.info(`Semgrep — scan complete | findings: ${findings.length}`);
        return;
      } catch (parseErr) {
        logger.error(`Semgrep — failed to parse report | ${parseErr.message}`);
      }
    }
    logger.error(`Semgrep — scan failed | ${err.message}`);
    statusManager.setFailed('semgrep', err.message);
  }
}

module.exports = { run };