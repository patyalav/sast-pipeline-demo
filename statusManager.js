/**
 * statusManager.js
 * Tracks the real-time scan status of each SAST tool during a pipeline run.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — maintain and expose scan status for all 4 tools.
 * It does NOT: run tools, call APIs, write files, or contain business logic.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * reset()                          → Resets all tools to pending state
 * setRunning(tool)                 → Marks a tool as running
 * setDone(tool, findings)          → Marks a tool as done with finding count
 * setFailed(tool, errorMessage)    → Marks a tool as failed with error detail
 * getStatus()                      → Returns full status object for all tools
 * allDone()                        → Returns true if all tools are done or failed
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   Scan starts
 *         ↓
 *   reset() — all tools set to pending
 *         ↓
 *   Each tool agent calls setRunning(tool)
 *         ↓
 *   Tool completes → setDone(tool, count)
 *   Tool fails     → setFailed(tool, error)
 *         ↓
 *   Frontend polls /api/scan/status → getStatus() returned
 *         ↓
 *   allDone() returns true → frontend redirects to dashboard
 *
 *   ── Error scenarios ──
 *   Unknown tool name passed → logs warning, no state change
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const logger = require('./logger');

// ── Valid tool names ──────────────────────────────────────────────────────────
const TOOLS = ['gitleaks', 'semgrep', 'sonarqube', 'codacy'];

// ── In-memory status store ────────────────────────────────────────────────────
// Single object shared across all modules via require() caching
let status = {};

/**
 * reset
 * Resets all tools to pending state — called at the start of every scan.
 *
 * @returns {void}
 */
function reset() {
  TOOLS.forEach(tool => {
    status[tool] = { status: 'pending', findings: null, error: null };
  });
  logger.info('StatusManager — all tools reset to pending');
}

/**
 * setRunning
 * Marks a tool as currently running.
 *
 * @param {string} tool - Tool name (gitleaks|semgrep|sonarqube|codacy)
 * @returns {void}
 */
function setRunning(tool) {
  if (!_isValid(tool)) return;
  status[tool].status = 'running';
  logger.info(`StatusManager — ${tool} → running`);
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
  status[tool].status = 'done';
  status[tool].findings = findings;
  logger.info(`StatusManager — ${tool} → done | findings: ${findings}`);
}

/**
 * setFailed
 * Marks a tool as failed with an error message.
 *
 * @param {string} tool    - Tool name
 * @param {string} message - Error description
 * @returns {void}
 */
function setFailed(tool, message) {
  if (!_isValid(tool)) return;
  status[tool].status = 'failed';
  status[tool].error = message;
  logger.error(`StatusManager — ${tool} → failed | ${message}`);
}

/**
 * getStatus
 * Returns the full status object for all tools.
 *
 * @returns {object} - Status object keyed by tool name
 */
function getStatus() {
  return status;
}

/**
 * allDone
 * Returns true when all tools have reached a terminal state (done or failed).
 *
 * @returns {boolean}
 */
function allDone() {
  return TOOLS.every(tool => ['done', 'failed'].includes(status[tool]?.status));
}

/**
 * _isValid
 * Internal guard — checks if tool name is recognised.
 *
 * @param {string} tool - Tool name to validate
 * @returns {boolean}
 */
function _isValid(tool) {
  if (!TOOLS.includes(tool)) {
    logger.warn(`StatusManager — unknown tool: ${tool}`);
    return false;
  }
  return true;
}

// Initialise on load
reset();

module.exports = { reset, setRunning, setDone, setFailed, getStatus, allDone };