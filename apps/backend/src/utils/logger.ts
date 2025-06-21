const formatLog = (messages: unknown[]) => {
  return `[${new Date().toISOString()}] ${messages.join(" ")}`
}

export const logger = {
  log(...messages: unknown[]) {
    console.log(formatLog(messages))
  },
  info(...messages: unknown[]) {
    console.log(formatLog(messages))
  },
  error(...messages: unknown[]) {
    console.error(formatLog(messages))
  },
  warn(...messages: unknown[]) {
    console.warn(formatLog(messages))
  },
  debug(...messages: unknown[]) {
    if (process.env.DEBUG) {
      console.debug(formatLog(messages))
    }
  },
}
