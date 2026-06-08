/**
 * orchestrator.js
 * Coordinates the full SAST scan pipeline for a given GitHub repository.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — run all 4 tool agents sequentially and combine results.
 * It does NOT: implement tool logic, validate URLs, or serve HTTP responses.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * runScan(repoUrl)
 * → Returns: reportPath (string) on success
 * → Throws:  Error on fatal failure
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   repoUrl received
 *         ↓
 *   Reset statusManager — all tools + steps to pending
 *         ↓
 *   Create timestamped reports folder
 *         ↓
 *   setRunning('clone')
 *   git clone repoUrl → temp folder
 *   setStepDone('clone')
 *         ↓
 *   Sequential execution — 5s delay between each tool:
 *     1. gitleaks.run(repoPath, reportsDir)  → 5s delay
 *     2. semgrep.run(repoPath, reportsDir)   → 5s delay
 *     3. sonarqube.run(repoPath, reportsDir) → 5s delay
 *     4. codacy.run(repoPath, reportsDir)
 *         ↓
 *   combineReports(reportsDir)
 *         ↓
 *   setRunning('cleanup')
 *   cleanupRepo(repoPath)
 *   setStepDone('cleanup')
 *         ↓
 *   Return reportPath
 *
 *   ── Error scenarios ──
 *   git clone fails        → setFailed('clone'), cleanup, throw error
 *   Individual tool fails  → logged, partial report still generated
 *   combineReports fails   → cleanup, throw error
 *   cleanup fails          → logged, does not affect result
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();
const path      = require('path');
const fs        = require('fs');
const { exec }  = require('child_process');
const util      = require('util');
const execAsync = util.promisify(exec);

const logger        = require('./logger');
const statusManager = require('./statusManager');
const { combineReports } = require('./utils/reportCombiner');
const { cleanupRepo }    = require('./utils/cleanup');

const gitleaks  = require('./agents/gitleaks');
const semgrep   = require('./agents/semgrep');
const sonarqube = require('./agents/sonarqube');
const codacy    = require('./agents/codacy');

/**
 * delay
 * Pauses execution for a given number of milliseconds.
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * getTimestampedDir
 * Creates a timestamped reports folder for this scan run.
 *
 * @returns {string} - Absolute path to the created folder
 */
function getTimestampedDir() {
  const now   = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir   = path.resolve(process.env.REPORTS_DIR || './reports', stamp);
  fs.mkdirSync(dir, { recursive: true });
  logger.info(`Orchestrator — reports folder: ${dir}`);
  return dir;
}

/**
 * cloneRepo
 * Clones the GitHub repository to a temp folder inside reports dir.
 *
 * @param {string} repoUrl    - GitHub repo URL
 * @param {string} reportsDir - Timestamped reports folder path
 * @returns {string}          - Path to cloned repo
 */
async function cloneRepo(repoUrl, reportsDir) {
  const repoPath = path.join(reportsDir, 'repo');
  logger.info(`Orchestrator — cloning: ${repoUrl}`);
  await execAsync(`git clone --depth 1 ${repoUrl} ${repoPath}`);
  logger.info(`Orchestrator — clone complete: ${repoPath}`);
  return repoPath;
}

/**
 * runScan
 * Main pipeline entry point — clones repo, runs all agents sequentially,
 * combines reports and cleans up.
 *
 * @param {string} repoUrl - Validated GitHub repo URL
 * @returns {string}       - Path to pipeline-report.json
 * @throws {Error}         - On clone or combine failure
 */
async function runScan(repoUrl) {
  logger.info('Orchestrator — scan started');

  // ── Reset all tool and step statuses ──────────────────────────────────────
  statusManager.reset();

  // ── Create timestamped reports folder ─────────────────────────────────────
  const reportsDir = getTimestampedDir();
  let repoPath     = null;

  try {
    // ── Clone repo ───────────────────────────────────────────────────────────
    statusManager.setRunning('clone');
    try {
      repoPath = await cloneRepo(repoUrl, reportsDir);
      statusManager.setStepDone('clone');
    } catch (cloneErr) {
      statusManager.setFailed('clone', cloneErr.message);
      throw cloneErr;
    }

    // ── Run all 4 agents sequentially ────────────────────────────────────────
    // 5s delay between tools — makes progress visible on frontend
    logger.info('Orchestrator — starting agents sequentially');

    await gitleaks.run(repoPath, reportsDir);
    await delay(2000);

    await semgrep.run(repoPath, reportsDir);
    await delay(2000);

    await sonarqube.run(repoPath, reportsDir);
    await delay(2000);

    await codacy.run(repoPath, reportsDir);

    logger.info('Orchestrator — all agents complete');

    // ── Combine reports ──────────────────────────────────────────────────────
    const combined = combineReports(reportsDir);
    if (!combined.success) {
      throw new Error(`Report combine failed — ${combined.reason}`);
    }
    logger.info(`Orchestrator — pipeline-report.json ready | total: ${combined.summary.totalFindings}`);

    return combined.reportPath;

  } finally {
    // ── Cleanup — always runs regardless of success or failure ───────────────
    if (repoPath) {
      statusManager.setRunning('cleanup');
      const cleanup = cleanupRepo(repoPath);
      if (!cleanup.success) {
        logger.warn(`Orchestrator — cleanup warning: ${cleanup.reason}`);
      }
      statusManager.setStepDone('cleanup');
    }
  }
}

module.exports = { runScan };