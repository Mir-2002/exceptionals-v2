// filepath: client-v2/src/utils/logger.js
const isProd =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.PROD;

const noop = () => {};

export const logger = {
  debug: isProd ? noop : (...args) => console.debug(...args),
  log: isProd ? noop : (...args) => console.log(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export default logger;
