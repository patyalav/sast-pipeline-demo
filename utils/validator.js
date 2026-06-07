/**
 * validator.js
 * Validates the GitHub repository URL submitted by the user before scanning.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — validate the incoming GitHub repo URL.
 * It does NOT: clone repos, call APIs, or handle any scan logic.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * validateRepoUrl(url)
 * → Returns: { valid: true, url: normalised url }
 * → Returns: { valid: false, reason: 'explanation' }
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   URL received
 *         ↓
 *   Is it empty or missing?     → invalid — 'Repository URL is required'
 *         ↓
 *   Is it a string?             → invalid — 'URL must be a string'
 *         ↓
 *   Trim whitespace
 *         ↓
 *   Does it match GitHub URL pattern?
 *   → No  → invalid — 'Must be a valid GitHub repository URL'
 *   → Yes → valid — return normalised URL
 *
 *   ── Error scenarios ──
 *   Empty string      → invalid
 *   null / undefined  → invalid
 *   Non-GitHub URL    → invalid
 *   Valid GitHub URL  → valid
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const logger = require('../logger');

// ── GitHub URL pattern ────────────────────────────────────────────────────────
// Accepts: https://github.com/owner/repo or https://github.com/owner/repo.git
const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/i;

/**
 * validateRepoUrl
 * Validates that the submitted URL is a well-formed GitHub repository URL.
 *
 * @param {string} url - The GitHub repo URL submitted by the user
 * @returns {{ valid: boolean, url?: string, reason?: string }}
 */
function validateRepoUrl(url) {
  logger.info('Validator — checking submitted URL');

  // ── Check 1 — missing or empty ────────────────────────────────────────────
  if (!url || typeof url !== 'string') {
    logger.warn('Validator — URL missing or not a string');
    return { valid: false, reason: 'Repository URL is required' };
  }

  // ── Normalise — trim whitespace and trailing slash ────────────────────────
  const trimmed = url.trim().replace(/\/$/, '');

  if (trimmed.length === 0) {
    logger.warn('Validator — URL is empty after trimming');
    return { valid: false, reason: 'Repository URL is required' };
  }

  // ── Check 2 — must match GitHub URL pattern ───────────────────────────────
  if (!GITHUB_URL_PATTERN.test(trimmed)) {
    logger.warn(`Validator — invalid URL format: ${trimmed}`);
    return { valid: false, reason: 'Must be a valid GitHub repository URL (https://github.com/owner/repo)' };
  }

  logger.info(`Validator — URL valid: ${trimmed}`);
  return { valid: true, url: trimmed };
}

module.exports = { validateRepoUrl };