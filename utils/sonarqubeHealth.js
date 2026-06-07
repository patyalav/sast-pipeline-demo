/**
 * sonarqubeHealth.js
 * Checks if the SonarQube instance is reachable and running before scans begin.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — ping SonarQube's health endpoint and confirm UP.
 * It does NOT: run scans, manage status, or handle any other tool.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * checkSonarQubeHealth()
 * → Returns: { healthy: true }
 * → Returns: { healthy: false, reason: 'explanation' }
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   GET {SONARQUBE_URL}/api/system/status
 *         ↓
 *   Response received?
 *   → No (timeout/refused) → unhealthy — cannot reach SonarQube
 *         ↓
 *   Response status === 'UP'?
 *   → No  → unhealthy — SonarQube responded but not ready
 *   → Yes → healthy ✅
 *
 *   ── Error scenarios ──
 *   Docker not running        → connection refused → unhealthy
 *   SonarQube still starting  → status not UP yet → unhealthy
 *   Network timeout           → unhealthy
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();
const axios  = require('axios');
const logger = require('../logger');

/**
 * checkSonarQubeHealth
 * Pings SonarQube health endpoint and confirms status is UP.
 *
 * @returns {Promise<{ healthy: boolean, reason?: string }>}
 */
async function checkSonarQubeHealth() {
  const url = `${process.env.SONARQUBE_URL}/api/system/status`;
  logger.info(`SonarQube health check — ${url}`);

  try {
    const response = await axios.get(url, { timeout: 5000 });

    if (response.data?.status === 'UP') {
      logger.info('SonarQube health check — UP ✅');
      return { healthy: true };
    }

    // Responded but not ready yet
    logger.warn(`SonarQube health check — status: ${response.data?.status}`);
    return { healthy: false, reason: `SonarQube status: ${response.data?.status}` };

  } catch (err) {
    logger.error(`SonarQube health check — failed | ${err.message}`);
    return { healthy: false, reason: `Cannot reach SonarQube: ${err.message}` };
  }
}

module.exports = { checkSonarQubeHealth };