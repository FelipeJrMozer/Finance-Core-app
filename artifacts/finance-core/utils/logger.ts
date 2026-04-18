const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const logger = {
  debug: (...args: unknown[]) => { if (isDev) console.log(...args); },
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
  warn: (...args: unknown[]) => { console.warn(...args); },
  error: (...args: unknown[]) => { console.error(...args); },
};
