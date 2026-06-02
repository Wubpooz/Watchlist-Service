import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from 'hono/logger';

const isProduction = process.env.NODE_ENV === 'production';
const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_FILE = process.env.LOG_FILE || 'server.log';
let logPathPromise: Promise<string> | null = null;

const getLogPath = async (): Promise<string> => {
  logPathPromise ??= (async () => {
    await mkdir(LOG_DIR, { recursive: true });
    return join(LOG_DIR, LOG_FILE);
  })();
  return logPathPromise;
};

export const customLogger = (message: string, ...rest: string[]): void => {
  const fullMessage = [message, ...rest].filter(Boolean).join(' ');
  const timestamped = `${new Date().toISOString()} ${fullMessage}`;
  
  // ALWAYS output to console. 
  // Vercel will capture this and show it in the Runtime Logs dashboard.
  console.log(timestamped);

  // ONLY attempt to write to the physical hard drive if we are NOT on Vercel
  if (!isProduction) {
    const line = `${timestamped}\n`;
    void getLogPath()
      .then((path) => appendFile(path, line))
      .catch((error) => {
        console.error('Failed to write log file', error);
      });
  }
};

export const requestLogger = logger(customLogger);