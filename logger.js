/**
 * logger.js
 * Centralised Winston logger — writes to terminal and log file simultaneously.
 *
 * ─── Responsibility ───────────────────────────────────────────────────────────
 * This file does ONE thing — provide a configured Winston logger instance.
 * It does NOT: handle errors, import other modules, or contain business logic.
 *
 * ─── Functions Exposed ────────────────────────────────────────────────────────
 * logger.info(message)  → INFO level log
 * logger.warn(message)  → WARN level log
 * logger.error(message) → ERROR level log
 * logger.debug(message) → DEBUG level log — only visible when DEBUG_MODE=true
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   App starts
 *         ↓
 *   logger.js loads — reads DEBUG_MODE from .env
 *         ↓
 *   DEBUG_MODE=true  → log level set to 'debug' (all 4 levels visible)
 *   DEBUG_MODE=false → log level set to 'info'  (debug hidden)
 *         ↓
 *   Winston creates two transports:
 *     ├── Console → terminal output
 *     └── File    → demo-pipeline.log
 *         ↓
 *   Any module calls logger.info / logger.warn / logger.error / logger.debug
 *
 *   ── Error scenarios ──
 *   LOG_FILE path invalid → Winston will throw on startup — check .env
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();
const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize } = format;

// ── Log format — [TIMESTAMP] [LEVEL] message ──────────────────────────────────
const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
});

// ── Log level — debug if DEBUG_MODE=true, otherwise info ─────────────────────
// This means DEBUG logs are only visible during local development
const logLevel = process.env.DEBUG_MODE === 'true' ? 'debug' : 'info';

const logger = createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Terminal output — with colour
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    // File output — plain text, no colour codes
    new transports.File({
      filename: process.env.LOG_FILE || './demo-pipeline.log'
    })
  ]
});

module.exports = logger;
