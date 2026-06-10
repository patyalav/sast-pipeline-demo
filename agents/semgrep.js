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
 *   Run 1 — --config auto → OWASP rules → temp-auto-report.json
 *         ↓
 *   Run 2 — custom hallucination rules → temp-hallucination-report.json
 *         ↓
 *   Merge both results into semgrep-report.json
 *         ↓
 *   Delete temp files
 *         ↓
 *   setDone(total findings count)
 *
 *   ── Error scenarios ──
 *   Semgrep not in PATH           → setFailed
 *   repoPath does not exist       → setFailed
 *   Custom rules file not found   → log warning, continue with auto scan only
 *   Report file not written       → setFailed
 *   PYTHONUTF8 not set            → may cause encoding errors on Windows
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

// ── Path to custom hallucination rules ────────────────────────────────────────
const HALLUCINATION_RULES = path.resolve(__dirname, '../semgrep-rules/hallucination.yml');

/**
 * runSemgrepCmd
 * Executes a single Semgrep command and returns parsed results array.
 * Handles both exit code 0 (no findings) and exit code 1 (findings found).
 *
 * @param {string} cmd        - Full Semgrep CLI command
 * @param {string} outputFile - Path where Semgrep writes JSON output
 * @returns {Promise<Array>}  - Array of findings (empty if none)
 */
async function runSemgrepCmd(cmd, outputFile) {
  try {
    await execAsync(cmd, {
      env      : { ...process.env, PYTHONUTF8: '1' },
      maxBuffer: 50 * 1024 * 1024
    });
  } catch (err) {
    // Exit code 1 = findings found — not a real error
    // Only re-throw if output file was NOT written
    if (!fs.existsSync(outputFile)) {
      throw err;
    }
  }

  if (!fs.existsSync(outputFile)) {
    return [];
  }

  try {
    const raw = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    return Array.isArray(raw?.results) ? raw.results : [];
  } catch (parseErr) {
    logger.warn(`Semgrep — failed to parse output: ${outputFile} | ${parseErr.message}`);
    return [];
  }
}

/**
 * run
 * Executes two Semgrep scans — OWASP rules + hallucination rules —
 * merges results and writes semgrep-report.json.
 *
 * @param {string} repoPath   - Absolute path to the cloned repository
 * @param {string} reportsDir - Absolute path to the timestamped reports folder
 * @returns {Promise<void>}
 */
async function run(repoPath, reportsDir) {
  statusManager.setRunning('semgrep');
  logger.info('Semgrep — starting scan');

  const reportFile      = path.join(reportsDir, 'semgrep-report.json');
  const autoTempFile    = path.join(reportsDir, 'semgrep-auto-temp.json');
  const hallTempFile    = path.join(reportsDir, 'semgrep-hall-temp.json');

  try {
    // ── Scan 1 — OWASP auto rules ─────────────────────────────────────────
    logger.info('Semgrep — running OWASP ruleset');
    const cmdAuto = `semgrep --config auto --json --output "${autoTempFile}" --timeout 120 "${repoPath}"`;
    logger.debug(`Semgrep — auto command: ${cmdAuto}`);
    const autoFindings = await runSemgrepCmd(cmdAuto, autoTempFile);
    logger.info(`Semgrep — OWASP scan complete | findings: ${autoFindings.length}`);

    // ── Scan 2 — Hallucination custom rules ───────────────────────────────
    let hallFindings = [];
    if (fs.existsSync(HALLUCINATION_RULES)) {
      logger.info('Semgrep — running hallucination ruleset');
      const cmdHall = `semgrep --config "${HALLUCINATION_RULES}" --json --output "${hallTempFile}" --timeout 60 "${repoPath}"`;
      logger.debug(`Semgrep — hallucination command: ${cmdHall}`);
      hallFindings = await runSemgrepCmd(cmdHall, hallTempFile);
      logger.info(`Semgrep — hallucination scan complete | findings: ${hallFindings.length}`);
    } else {
      logger.warn(`Semgrep — hallucination rules not found: ${HALLUCINATION_RULES}`);
    }

    // ── Merge results ─────────────────────────────────────────────────────
    const allFindings = [...autoFindings, ...hallFindings];
    const merged      = { results: allFindings };

    fs.writeFileSync(reportFile, JSON.stringify(merged, null, 2));
    logger.info(`Semgrep — merged report written | total findings: ${allFindings.length}`);

    // ── Cleanup temp files ────────────────────────────────────────────────
    if (fs.existsSync(autoTempFile)) fs.unlinkSync(autoTempFile);
    if (fs.existsSync(hallTempFile)) fs.unlinkSync(hallTempFile);

    statusManager.setDone('semgrep', allFindings.length);

  } catch (err) {
    logger.error(`Semgrep — scan failed | ${err.message}`);
    statusManager.setFailed('semgrep', err.message);
  }
}

module.exports = { run };