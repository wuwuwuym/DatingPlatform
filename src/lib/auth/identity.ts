import { createHmac } from "node:crypto";

/**
 * Removes separators that students commonly type (spaces, dashes) so that
 * "2021 0001", "2021-0001" and "20210001" cannot be registered twice.
 */
export function normalizeStudentNo(input: string): string {
  return input.trim().replace(/[\s\-‐-―]/g, "");
}

export function isValidStudentNo(input: string): boolean {
  return /^\d{6,12}$/.test(normalizeStudentNo(input));
}

/**
 * Student numbers have very low entropy, so a plain SHA-256 would be
 * rainbow-table recoverable. A server-side pepper makes the hash useless
 * without the deployment secret, while still allowing a unique index.
 */
export function hashStudentNo(
  schoolId: string,
  studentNo: string,
  pepper: string,
): string {
  return createHmac("sha256", pepper)
    .update(`${schoolId}:${normalizeStudentNo(studentNo)}`)
    .digest("hex");
}

/** Never log a raw student number; this keeps originals out of error reports. */
export function maskStudentNo(input: string): string {
  const normalized = normalizeStudentNo(input);
  if (normalized.length <= 4) return "*".repeat(normalized.length);
  return `${normalized.slice(0, 2)}${"*".repeat(normalized.length - 4)}${normalized.slice(-2)}`;
}
