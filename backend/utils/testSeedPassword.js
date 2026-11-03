import { randomBytes } from "node:crypto";

// Never publish a reusable login password in a seed script or its output.
// Supply interactive test-account passwords through the caller's environment.
export function testSeedPassword(name, { required = true, env = process.env } = {}) {
  const value = env[name];
  if (!value && !required) return randomBytes(32).toString("base64url");
  if (typeof value !== "string" || value.length < 16 || Buffer.byteLength(value, "utf8") > 72) {
    throw new Error(`Set ${name} privately to a password of at least 16 characters and at most 72 UTF-8 bytes.`);
  }
  return value;
}
