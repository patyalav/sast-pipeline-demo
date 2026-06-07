/**
 * reportCombiner.js
 * Reads individual tool JSON reports and merges them into pipeline-report.json.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — combine 4 tool reports into one unified report.
 * It does NOT: normalise severity, run tools, call APIs, or manage status.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * combineReports(reportsDir)
 * → Returns: { success: true, reportPath, summary }
 * → Returns: { success: false, reason }
 *
 * ─── Report Structure ─────────────────────────────────────────────────────────
 * Each tool's findings are stored as-is — no severity normalisation.
 * Native severity labels are preserved per tool.
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   reportsDir received
 *         ↓
 *   Read each tool JSON file (skip if missing — partial report allowed)
 *         ↓
 *   Extract findings array per tool — preserve native fields
 *         ↓
 *   Build per-tool summary — count + native severity breakdown
 *         ↓
 *   Write pipeline-report.json to reportsDir
 *         ↓
 *   Return { success: true, reportPath, summary }
 *
 *   ── Error scenarios ──
 *   reportsDir missing      → error returned
 *   All tool files missing  → error — nothing to combine
 *   Some files missing      → partial report from available tools
 *   Write fails             → error returned
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const logger = require('../logger');

// ── Tool report filenames ─────────────────────────────────────────────────────
const TOOL_FILES = {
  gitleaks  : 'gitleaks-report.json',
  semgrep   : 'semgrep-report.json',
  sonarqube : 'sonarqube-report.json',
  codacy    : 'codacy-report.json'
};

/**
 * extractFindings
 * Extracts findings from each tool's raw JSON — preserves native fields.
 *
 * @param {string} tool - Tool name
 * @param {object} raw  - Raw parsed JSON from tool report file
 * @returns {{ findings: Array, severityBreakdown: object }}
 */
function extractFindings(tool, raw) {
  let items = [];

  switch (tool) {
    case 'gitleaks':
      // Top-level array
      items = Array.isArray(raw) ? raw : [];
      return {
        findings: items,
        severityBreakdown: { 'Secret': items.length }
      };

    case 'semgrep':
      // Findings under results[]
      items = Array.isArray(raw?.results) ? raw.results : [];
      return {
        findings: items,
        severityBreakdown: _countBy(items, i => i?.extra?.severity || 'UNKNOWN')
      };

    case 'sonarqube':
      // Findings under issues[]
      items = Array.isArray(raw?.issues) ? raw.issues : [];
      return {
        findings: items,
        severityBreakdown: _countBy(items, i => i?.severity || 'UNKNOWN')
      };

    case 'codacy':
      // Findings under data[]
      items = Array.isArray(raw?.data) ? raw.data : [];
      return {
        findings: items,
        severityBreakdown: _countBy(items, i => i?.patternInfo?.level || 'UNKNOWN')
      };

    default:
      return { findings: [], severityBreakdown: {} };
  }
}

/**
 * _countBy
 * Counts occurrences of a value returned by a key function.
 *
 * @param {Array}    arr    - Array to count from
 * @param {Function} keyFn  - Function that returns the grouping key per item
 * @returns {object}        - { key: count }
 */
function _countBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

/**
 * combineReports
 * Reads all tool JSON reports and writes a unified pipeline-report.json.
 *
 * @param {string} reportsDir - Path to the timestamped scan reports folder
 * @returns {{ success: boolean, reportPath?: string, summary?: object, reason?: string }}
 */
function combineReports(reportsDir) {
  logger.info('ReportCombiner — starting');

  // ── Validate reportsDir ───────────────────────────────────────────────────
  if (!reportsDir || !fs.existsSync(reportsDir)) {
    logger.error(`ReportCombiner — directory not found: ${reportsDir}`);
    return { success: false, reason: 'Reports directory not found' };
  }

  const toolResults = {};
  let filesRead = 0;

  // ── Read each tool report ─────────────────────────────────────────────────
  for (const [tool, filename] of Object.entries(TOOL_FILES)) {
    const filePath = path.join(reportsDir, filename);

    if (!fs.existsSync(filePath)) {
      logger.warn(`ReportCombiner — ${tool} report not found, skipping`);
      toolResults[tool] = { status: 'skipped', findingCount: 0, severityBreakdown: {}, findings: [] };
      continue;
    }

    try {
      const raw                        = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const { findings, severityBreakdown } = extractFindings(tool, raw);
      toolResults[tool] = {
        status           : 'done',
        findingCount     : findings.length,
        severityBreakdown,
        findings
      };
      filesRead++;
      logger.info(`ReportCombiner — ${tool}: ${findings.length} findings`);
    } catch (err) {
      logger.error(`ReportCombiner — failed to parse ${tool} | ${err.message}`);
      toolResults[tool] = { status: 'error', findingCount: 0, severityBreakdown: {}, findings: [] };
    }
  }

  // ── Nothing to combine ────────────────────────────────────────────────────
  if (filesRead === 0) {
    logger.error('ReportCombiner — no tool reports found');
    return { success: false, reason: 'No tool reports available to combine' };
  }

  // ── Total findings across all tools ──────────────────────────────────────
  const totalFindings = Object.values(toolResults)
    .reduce((sum, t) => sum + t.findingCount, 0);

  // ── Build final report ────────────────────────────────────────────────────
  const report = {
    generatedAt : new Date().toISOString(),
    totalFindings,
    tools       : toolResults
  };

  // ── Write pipeline-report.json ────────────────────────────────────────────
  const reportPath = path.join(reportsDir, 'pipeline-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    logger.info(`ReportCombiner — written | total findings: ${totalFindings}`);
  } catch (err) {
    logger.error(`ReportCombiner — write failed | ${err.message}`);
    return { success: false, reason: err.message };
  }

  return {
    success  : true,
    reportPath,
    summary  : { totalFindings, tools: toolResults }
  };
}

module.exports = { combineReports };