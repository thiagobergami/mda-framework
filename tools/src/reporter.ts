import chalk from "chalk";
import type { ValidationResult, Diagnostic } from "./types.js";

function formatDiagnostic(d: Diagnostic): string {
  const prefix = d.level === "error"
    ? chalk.red("ERROR")
    : chalk.yellow("WARN ");
  const loc = d.specId
    ? chalk.dim(`[${d.specId}]`) + (d.file ? chalk.dim(` (${d.file})`) : "")
    : d.file ? chalk.dim(`(${d.file})`) : "";
  return `  ${prefix} ${chalk.dim(`[${d.rule}]`)} ${loc} ${d.message}`;
}

export function reportText(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold("========================================"));
  lines.push(chalk.bold("  MDA Spec Validation Report"));
  lines.push(chalk.bold("========================================"));
  lines.push("");

  // Stats
  lines.push(`Total specs: ${chalk.cyan(result.stats.totalSpecs)}`);
  for (const [layer, count] of Object.entries(result.stats.byLayer)) {
    lines.push(`  ${layer}: ${count}`);
  }
  lines.push(`Trace links: ${result.stats.traceLinks}`);
  lines.push(`Orphaned: ${result.stats.orphaned}`);
  lines.push("");

  // Errors
  const errors = result.diagnostics.filter((d) => d.level === "error");
  if (errors.length > 0) {
    lines.push(chalk.red(`ERRORS (${errors.length}):`));
    for (const e of errors) {
      lines.push(formatDiagnostic(e));
    }
    lines.push("");
  }

  // Warnings
  const warnings = result.diagnostics.filter((d) => d.level === "warning");
  if (warnings.length > 0) {
    lines.push(chalk.yellow(`WARNINGS (${warnings.length}):`));
    for (const w of warnings) {
      lines.push(formatDiagnostic(w));
    }
    lines.push("");
  }

  // Result
  if (result.passed) {
    lines.push(chalk.green.bold("RESULT: PASSED") + chalk.dim(" (no errors)"));
  } else {
    lines.push(chalk.red.bold(`RESULT: FAILED`) + chalk.dim(` (${errors.length} error${errors.length !== 1 ? "s" : ""})`));
  }
  lines.push(chalk.bold("========================================"));

  return lines.join("\n");
}

export function reportJson(result: ValidationResult): string {
  return JSON.stringify(result, null, 2);
}
