/**
 * server.js
 * Express server — entry point for the SAST pipeline demo backend.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — set up Express, register routes, start the server.
 * It does NOT: run tools, parse reports, manage scan logic, or clone repos.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * None — this is the entry point, not a module.
 *
 * ─── Routes ───────────────────────────────────────────────────────────────────
 * GET  /health           → confirms server is alive
 * POST /api/scan         → validates URL, triggers orchestrator
 * GET  /api/scan/status  → returns current per-tool scan status
 * GET  /api/scan/report  → returns final pipeline-report.json
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   Server starts
 *         ↓
 *   SonarQube health check — if DOWN, log warning (don't block startup)
 *         ↓
 *   Express listens on PORT
 *         ↓
 *   POST /api/scan received
 *         ↓
 *   validateRepoUrl() → invalid? → 400 response, stop
 *         ↓
 *   Scan already running? → 409 response, stop
 *         ↓
 *   orchestrator.runScan() called (async — does not block response)
 *         ↓
 *   202 Accepted returned immediately
 *         ↓
 *   Frontend polls GET /api/scan/status every 2s
 *         ↓
 *   allDone() true → frontend fetches GET /api/scan/report
 *
 *   ── Error scenarios ──
 *   Invalid URL          → 400 Bad Request
 *   Scan already running → 409 Conflict
 *   Report not ready     → 404 Not Found
 *   Server error         → 500 Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();
const express      = require('express');
const path         = require('path');
const logger       = require('./logger');
const { validateRepoUrl }       = require('./utils/validator');
const { checkSonarQubeHealth }  = require('./utils/sonarqubeHealth');
const statusManager             = require('./statusManager');
const orchestrator              = require('./orchestrator');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Track current report path ─────────────────────────────────────────────────
// Set by orchestrator once scan completes
let currentReportPath = null;

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /health
 * Confirms server is alive — used by Render and manual checks.
 */
app.get('/health', (req, res) => {
  logger.info('GET /health');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/scan
 * Validates the submitted GitHub URL and kicks off the scan pipeline.
 * Returns 202 immediately — scan runs in background.
 */
app.post('/api/scan', async (req, res) => {
  logger.info('POST /api/scan — request received');

  // ── Validate URL ──────────────────────────────────────────────────────────
  const validation = validateRepoUrl(req.body?.repo);
  if (!validation.valid) {
    logger.warn(`POST /api/scan — invalid URL | ${validation.reason}`);
    return res.status(400).json({ error: validation.reason });
  }

  // ── Check if scan already running ─────────────────────────────────────────
  const currentStatus = statusManager.getStatus();
  const isRunning = Object.values(currentStatus).some(t => t.status === 'running');
  if (isRunning) {
    logger.warn('POST /api/scan — scan already in progress');
    return res.status(409).json({ error: 'A scan is already in progress. Please wait.' });
  }

  // ── Reset report path ─────────────────────────────────────────────────────
  currentReportPath = null;

  // ── Kick off scan — non-blocking ──────────────────────────────────────────
  logger.info(`POST /api/scan — starting scan for: ${validation.url}`);
  orchestrator.runScan(validation.url)
    .then(reportPath => {
      currentReportPath = reportPath;
      logger.info(`Scan complete — report at: ${reportPath}`);
    })
    .catch(err => {
      logger.error(`Scan failed — ${err.message}`);
    });

  // ── Respond immediately — frontend will poll for status ───────────────────
  res.status(202).json({ message: 'Scan started', repo: validation.url });
});

/**
 * GET /api/scan/status
 * Returns real-time per-tool scan status — polled by progress.html every 2s.
 */
app.get('/api/scan/status', (req, res) => {
  const status = statusManager.getStatus();
  const done   = statusManager.allDone();
  res.json({ status, allDone: done });
});

/**
 * GET /api/scan/report
 * Returns the final pipeline-report.json once scan is complete.
 */
app.get('/api/scan/report', (req, res) => {
  if (!currentReportPath) {
    logger.warn('GET /api/scan/report — report not ready yet');
    return res.status(404).json({ error: 'Report not ready yet' });
  }

  try {
    const fs     = require('fs');
    const report = JSON.parse(fs.readFileSync(currentReportPath, 'utf8'));
    logger.info('GET /api/scan/report — serving report');
    res.json(report);
  } catch (err) {
    logger.error(`GET /api/scan/report — failed to read report | ${err.message}`);
    res.status(500).json({ error: 'Failed to read report' });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
async function startServer() {
  // Warn if SonarQube is not reachable — don't block startup
  const sonarHealth = await checkSonarQubeHealth();
  if (!sonarHealth.healthy) {
    logger.warn(`SonarQube not reachable at startup — ${sonarHealth.reason}`);
    logger.warn('SonarQube scans will fail until Docker container is running');
  }

  app.listen(PORT, () => {
    logger.info(`──────────────────────────────────────────`);
    logger.info(`SAST Pipeline Demo — server started`);
    logger.info(`URL      : http://localhost:${PORT}`);
    logger.info(`Health   : http://localhost:${PORT}/health`);
    logger.info(`──────────────────────────────────────────`);
  });
}

startServer();