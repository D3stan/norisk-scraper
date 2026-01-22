import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const logsDir = join(projectRoot, 'logs');

// Ensure logs directory exists
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'info';

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (context) {
      log += ` | Context: ${context}`;
    }
    
    if (Object.keys(metadata).length > 0) {
      log += ` | Data: ${JSON.stringify(metadata)}`;
    }
    
    return log;
  })
);

const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    // File output for all logs
    new winston.transports.File({
      filename: join(logsDir, 'automation.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Separate file for errors
    new winston.transports.File({
      filename: join(logsDir, 'errors.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    })
  ]
});

// Helper method to log with context
logger.logWithContext = (level, message, context, data = {}) => {
  logger.log({
    level,
    message,
    context,
    ...data
  });
};

export default logger;
