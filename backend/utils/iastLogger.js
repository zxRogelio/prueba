import fs from "fs";
import path from "path";

const logsDir = path.resolve("logs");
const logFile = path.join(logsDir, "iast.log");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const writeLine = (level, event, meta = {}) => {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  });

  console.log(`[IAST][${level}] ${event}`, meta);
  fs.appendFileSync(logFile, line + "\n", "utf8");
};

export const iastInfo = (event, meta = {}) => writeLine("INFO", event, meta);
export const iastWarn = (event, meta = {}) => writeLine("WARN", event, meta);
export const iastError = (event, meta = {}) => writeLine("ERROR", event, meta);