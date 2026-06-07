/**
 * statusManager.js
 * Tracks real-time status of pipeline steps and each SAST tool during a scan.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — maintain and expose scan status for the full pipeline.
 * It does NOT: run tools, call APIs, write files, or contain business logic.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * reset()                          → Resets all tools and pipeline steps to pending
 * setRunning(tool)                 → Marks a tool or step as running
 * setDone(tool, findings)          → Marks a tool as done with finding count
 * setStepDone(step)                → Marks a pipeline step as done
 * setFailed(tool, errorMessage)    → Marks a tool or step as failed
 * getStatus()                      → Returns full status object
 * allDone()                        → Returns true if all tools are done or failed
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   Scan starts
 *         ↓
 *   reset() — all tools + steps set to pending
 *         ↓
 *   setRunning('clone')
 *   setStepDone('clone')
 *         ↓
 *   Each tool → setRunning → setDone / setFailed
 *         ↓
 *   setRunning('cleanup')
 *   setStepDone('cleanup')
 *         ↓
 *   Frontend polls getStatus() → overlay updates in real time
 *
 *   ── Error scenarios ──
 *   Unknown tool/step name → logs warning, no state change
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const logger = require('./logger');

// ── Valid tool names ──────────────────────────────────────────────────────────
const TOOLS = ['gitleaks', 'semgrep', 'sonarqube', 'codacy'];

// ── Valid pipeline steps ──────────────────────────────────────────────────────
const STEPS = ['clone', 'cleanup'];

// ── In-memory status store ────────────────────────────────────────────────────
let status = {};

/**
 * reset
 * Resets all tools and pipeline steps to pending state.
 *
 * @returns {void}
 */
function reset() {
  // Reset tools
  TOOLS.forEach(tool => {
    status[tool] = { type: 'tool', status: 'pending', findings: null, error: null };
  });

  // Reset pipeline steps
  STEPS.forEach(step => {
    status[step] = { type: 'step', status: 'pending', error: null };
  });

  logger.info('StatusManager — reset to pending');
}

/**
 * setRunning
 * Marks a tool or pipeline step as currently running.
 *
 * @param {string} key - Tool name or step name
 * @returns {void}
 */
function setRunning(key) {
  if (!_isValid(key)) return;
  status[key].status = 'running';
  logger.info(`StatusManager — ${key} → running`);
}

/**
 * setDone
 * Marks a tool as completed with its finding count.
 *
 * @param {string} tool     - Tool name
 * @param {number} findings - Number of findings found
 * @returns {void}
 */
function setDone(tool, findings) {
  if (!_isValid(tool)) return;
  status[tool].status   = 'done';
  status[tool].findings = findings;
  logger.info(`StatusManager — ${tool} → done | findings: ${findings}`);
}

/**
 * setStepDone
 * Marks a pipeline step (clone/cleanup) as completed.
 *
 * @param {string} step - Step name
 * @returns {void}
 */
function setStepDone(step) {
  if (!_isValid(step)) return;
  status[step].status = 'done';
  logger.info(`StatusManager — ${step} → done`);
}

/**
 * setFailed
 * Marks a tool or pipeline step as failed.
 *
 * @param {string} key     - Tool name or step name
 * @param {string} message - Error description
 * @returns {void}
 */
function setFailed(key, message) {
  if (!_isValid(key)) return;
  status[key].status = 'failed';
  status[key].error  = message;
  logger.error(`StatusManager — ${key} → failed | ${message}`);
}

/**
 * getStatus
 * Returns the full status object for all tools and pipeline steps.
 *
 * @returns {object}
 */
function getStatus() {
  return status;
}

/**
 * allDone
 * Returns true when all tools have reached a terminal state (done or failed).
 * Pipeline steps are not included in this check.
 *
 * @returns {boolean}
 */
function allDone() {
  return TOOLS.every(tool => ['done', 'failed'].includes(status[tool]?.status));
}

/**
 * _isValid
 * Internal guard — checks if key is a recognised tool or step name.
 *
 * @param {string} key - Tool or step name
 * @returns {boolean}
 */
function _isValid(key) {
  if (![...TOOLS, ...STEPS].includes(key)) {
    logger.warn(`StatusManager — unknown key: ${key}`);
    return false;
  }
  return true;
}

// Initialise on load
reset();

module.exports = { reset, setRunning, setDone, setStepDone, setFailed, getStatus, allDone };