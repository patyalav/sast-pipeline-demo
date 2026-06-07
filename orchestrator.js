/**
 * orchestrator.js
 * Coordinates the full SAST scan pipeline for a given GitHub repository.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — run all 4 tool agents in parallel and combine results.
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
 *   Reset statusManager — all tools to pending
 *         ↓
 *   Create timestamped reports folder
 *         ↓
 *   git clone repoUrl → temp folder
 *         ↓
 *   Promise.all — run all 4 agents in parallel:
 *     ├── gitleaks.run(repoPath, reportsDir)
 *     ├── semgrep.run(repoPath, reportsDir)
 *     ├── sonarqube.run(repoPath, reportsDir)
 *     └── codacy.run(reportsDir)
 *         ↓
 *   combineReports(reportsDir)
 *         ↓
 *   cleanupRepo(repoPath) — always runs, even on error
 *         ↓
 *   Return reportPath
 *
 *   ── Error scenarios ──
 *   git clone fails        → cleanup, throw error
 *   Individual tool fails  → logged, partial report still generated
 *   combineReports fails   → cleanup, throw error
 *   cleanup fails          → logged, does not affect result
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();
const path    = require('path');
const fs      = require('fs');
const { exec } = require('child_process');
const util    = require('util');
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
 * getTimestampedDir
 * Creates a timestamped reports folder for this scan run.
 *
 * @returns {string} - Absolute path to the created folder
 */
function getTimestampedDir() {
  const now    = new Date();
  const stamp  = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir    = path.resolve(process.env.REPORTS_DIR || './reports', stamp);
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
 * Main pipeline entry point — clones repo, runs all agents, combines reports.
 *
 * @param {string} repoUrl - Validated GitHub repo URL
 * @returns {string}       - Path to pipeline-report.json
 * @throws {Error}         - On clone or combine failure
 */
async function runScan(repoUrl) {
  logger.info('Orchestrator — scan started');

  // ── Reset all tool statuses ───────────────────────────────────────────────
  statusManager.reset();

  // ── Create timestamped reports folder ────────────────────────────────────
  const reportsDir = getTimestampedDir();
  let repoPath     = null;

  try {
    // ── Clone repo ──────────────────────────────────────────────────────────
    repoPath = await cloneRepo(repoUrl, reportsDir);

    // ── Run all 4 agents in parallel ────────────────────────────────────────
    // Each agent handles its own status updates and errors internally
    logger.info('Orchestrator — starting all agents in parallel');
    await Promise.all([
      gitleaks.run(repoPath, reportsDir),
      semgrep.run(repoPath, reportsDir),
      sonarqube.run(repoPath, reportsDir),
      codacy.run(repoPath, reportsDir)
    ]);
    logger.info('Orchestrator — all agents complete');

    // ── Combine reports ─────────────────────────────────────────────────────
    const combined = combineReports(reportsDir);
    if (!combined.success) {
      throw new Error(`Report combine failed — ${combined.reason}`);
    }
    logger.info(`Orchestrator — pipeline-report.json ready | total: ${combined.summary.totalFindings}`);

    return combined.reportPath;

  } finally {
    // ── Cleanup — always runs regardless of success or failure ───────────────
    if (repoPath) {
      const cleanup = cleanupRepo(repoPath);
      if (!cleanup.success) {
        logger.warn(`Orchestrator — cleanup warning: ${cleanup.reason}`);
      }
    }
  }
}

module.exports = { runScan };