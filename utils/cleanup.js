/**
 * cleanup.js
 * Deletes the cloned repository folder after a scan completes or fails.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — delete a given directory from the filesystem.
 * It does NOT: run tools, manage status, or handle scan logic.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * cleanupRepo(dirPath)
 * → Returns: { success: true }
 * → Returns: { success: false, reason: 'explanation' }
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   dirPath received
 *         ↓
 *   Is dirPath empty or missing?  → return error — no path provided
 *         ↓
 *   Does the directory exist?
 *   → No  → log warning, return success (nothing to delete)
 *   → Yes → delete recursively
 *         ↓
 *   Deletion successful → log info, return { success: true }
 *   Deletion fails      → log error, return { success: false, reason }
 *
 *   ── Error scenarios ──
 *   Path not provided        → error returned
 *   Directory does not exist → warning logged, success returned (idempotent)
 *   Deletion fails (locked)  → error returned with reason
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const logger = require('../logger');

/**
 * cleanupRepo
 * Deletes the cloned repository directory from the filesystem.
 *
 * @param {string} dirPath - Absolute path to the directory to delete
 * @returns {{ success: boolean, reason?: string }}
 */
function cleanupRepo(dirPath) {

  // ── Check 1 — path must be provided ───────────────────────────────────────
  if (!dirPath || typeof dirPath !== 'string' || dirPath.trim().length === 0) {
    logger.error('Cleanup — no directory path provided');
    return { success: false, reason: 'No directory path provided' };
  }

  const resolvedPath = path.resolve(dirPath.trim());

  // ── Check 2 — does directory exist? ───────────────────────────────────────
  // Idempotent — if already deleted, treat as success
  if (!fs.existsSync(resolvedPath)) {
    logger.warn(`Cleanup — directory not found, skipping: ${resolvedPath}`);
    return { success: true };
  }

  // ── Delete recursively ─────────────────────────────────────────────────────
  try {
    fs.rmSync(resolvedPath, { recursive: true, force: true });
    logger.info(`Cleanup — deleted: ${resolvedPath}`);
    return { success: true };
  } catch (err) {
    logger.error(`Cleanup — failed to delete ${resolvedPath} | ${err.message}`);
    return { success: false, reason: err.message };
  }
}

module.exports = { cleanupRepo };