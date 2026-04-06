const winston = require('winston');

// A single, shared logger used across utils/framework/platform.
// Keep it dependency-light and safe to import from any context (setup, generators, tests).

const logLevel = process.env.LOG_LEVEL || (process.env.CI ? 'info' : 'info');

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level}] ${message}${metaString}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

module.exports = { logger };