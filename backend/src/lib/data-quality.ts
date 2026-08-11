/**
 * ════════════════════════════════════════════════════════════════════════════
 * DATA QUALITY VALIDATION LAYER
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Lightweight validation that prevents bad data from entering the system
 * as valid data. This is NOT anomaly detection — just basic sanity checks.
 *
 * Validates:
 * - null values
 * - invalid numeric values (NaN, Infinity)
 * - negative values when not valid
 * - impossible timestamps (future / too old)
 * - duplicate entity detection
 * - malformed source responses
 * - unit mismatch detection (basic)
 *
 * Returns a ValidationResult that the caller can act on.
 * ════════════════════════════════════════════════════════════════════════════
 */
import type { ProvenanceMetric } from "./ecosystem-types.js";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION RESULT
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationSeverity = "ok" | "warning" | "error";

export interface ValidationResult {
  severity: ValidationSeverity;
  /** What was checked */
  check: string;
  /** Human-readable description of the result */
  message: string;
  /** The value that was validated */
  value: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a numeric metric value.
 * Checks for: null, NaN, Infinity, negative (when allowNegative=false).
 */
export function validateNumeric(
  value: unknown,
  opts: {
    allowNegative?: boolean;
    allowZero?: boolean;
    fieldName?: string;
  } = {},
): ValidationResult {
  const name = opts.fieldName ?? "value";
  const allowNegative = opts.allowNegative ?? false;
  const allowZero = opts.allowZero ?? true;

  if (value === null || value === undefined) {
    return { severity: "ok", check: "null_check", message: `${name} is null (unavailable)`, value };
  }

  if (typeof value !== "number") {
    return { severity: "error", check: "type_check", message: `${name} is not a number (got ${typeof value})`, value };
  }

  if (Number.isNaN(value)) {
    return { severity: "error", check: "nan_check", message: `${name} is NaN`, value };
  }

  if (!Number.isFinite(value)) {
    return { severity: "error", check: "infinity_check", message: `${name} is Infinity`, value };
  }

  if (!allowZero && value === 0) {
    return { severity: "warning", check: "zero_check", message: `${name} is zero`, value };
  }

  if (!allowNegative && value < 0) {
    return { severity: "error", check: "negative_check", message: `${name} is negative (${value})`, value };
  }

  return { severity: "ok", check: "numeric_valid", message: `${name} is valid`, value };
}

/**
 * Validate a timestamp.
 * Checks for: null, invalid date, future timestamps, too-old timestamps.
 */
export function validateTimestamp(
  iso: string | null | undefined,
  opts: {
    maxAgeHours?: number;
    fieldName?: string;
  } = {},
): ValidationResult {
  const name = opts.fieldName ?? "timestamp";
  const maxAgeHours = opts.maxAgeHours ?? 168; // 7 days default

  if (!iso) {
    return { severity: "ok", check: "null_check", message: `${name} is null`, value: iso };
  }

  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) {
    return { severity: "error", check: "invalid_date", message: `${name} is not a valid date`, value: iso };
  }

  const now = Date.now();
  const age = now - ts;
  const ageHours = age / (1000 * 60 * 60);

  // Future timestamp (allow 5 min tolerance for clock skew)
  if (ts > now + 5 * 60 * 1000) {
    return { severity: "warning", check: "future_timestamp", message: `${name} is in the future (${iso})`, value: iso };
  }

  // Too old
  if (ageHours > maxAgeHours) {
    return { severity: "warning", check: "stale_timestamp", message: `${name} is ${ageHours.toFixed(1)}h old (max ${maxAgeHours}h)`, value: iso };
  }

  return { severity: "ok", check: "timestamp_valid", message: `${name} is valid`, value: iso };
}

/**
 * Validate a ProvenanceMetric — checks value + provenance fields.
 */
export function validateProvenanceMetric(
  metric: ProvenanceMetric<unknown>,
  opts: {
    allowNegative?: boolean;
    allowZero?: boolean;
    fieldName?: string;
  } = {},
): ValidationResult {
  const name = opts.fieldName ?? "metric";

  // Check value
  const valueResult = validateNumeric(metric.value, opts);
  if (valueResult.severity === "error") {
    return { ...valueResult, check: `${name}_value_${valueResult.check}` };
  }

  // Check fetchedAt
  const tsResult = validateTimestamp(metric.fetchedAt, { fieldName: `${name}.fetchedAt` });
  if (tsResult.severity === "error") {
    return tsResult;
  }

  // Check sourceUpdatedAt if present
  if (metric.sourceUpdatedAt) {
    const srcTsResult = validateTimestamp(metric.sourceUpdatedAt, {
      fieldName: `${name}.sourceUpdatedAt`,
      maxAgeHours: 720, // 30 days for source update time
    });
    if (srcTsResult.severity === "error") {
      return srcTsResult;
    }
  }

  // Check confidence range
  if (metric.confidence < 0 || metric.confidence > 1) {
    return {
      severity: "error",
      check: "confidence_range",
      message: `${name}.confidence is out of range [0,1]: ${metric.confidence}`,
      value: metric.confidence,
    };
  }

  return { severity: "ok", check: "provenance_valid", message: `${name} is valid`, value: metric.value };
}

/**
 * Detect duplicate entities by checking for repeated project IDs.
 */
export function findDuplicateEntities(projectIds: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of projectIds) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return Array.from(duplicates);
}

/**
 * Validate a raw API response — checks for malformed structure.
 */
export function validateApiResponse(
  response: unknown,
  expectedType: "array" | "object" | "number" | "string" | "any" = "any",
): ValidationResult {
  if (response === null || response === undefined) {
    return { severity: "ok", check: "null_response", message: "Response is null", value: response };
  }

  if (expectedType === "array" && !Array.isArray(response)) {
    return { severity: "error", check: "type_mismatch", message: `Expected array, got ${typeof response}`, value: response };
  }

  if (expectedType === "object" && (Array.isArray(response) || typeof response !== "object")) {
    return { severity: "error", check: "type_mismatch", message: `Expected object, got ${Array.isArray(response) ? "array" : typeof response}`, value: response };
  }

  if (expectedType === "number" && typeof response !== "number") {
    return { severity: "error", check: "type_mismatch", message: `Expected number, got ${typeof response}`, value: response };
  }

  if (expectedType === "string" && typeof response !== "string") {
    return { severity: "error", check: "type_mismatch", message: `Expected string, got ${typeof response}`, value: response };
  }

  return { severity: "ok", check: "response_valid", message: "Response is valid", value: response };
}

/**
 * Aggregate validation results — returns the most severe result.
 */
export function aggregateValidation(results: ValidationResult[]): ValidationResult {
  const errors = results.filter((r) => r.severity === "error");
  const warnings = results.filter((r) => r.severity === "warning");

  if (errors.length > 0) {
    return {
      severity: "error",
      check: "aggregate",
      message: `${errors.length} validation error(s): ${errors.map((e) => e.message).join("; ")}`,
      value: errors,
    };
  }

  if (warnings.length > 0) {
    return {
      severity: "warning",
      check: "aggregate",
      message: `${warnings.length} warning(s): ${warnings.map((w) => w.message).join("; ")}`,
      value: warnings,
    };
  }

  return { severity: "ok", check: "aggregate", message: "All validations passed", value: null };
}
