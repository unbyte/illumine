/**
 * An expected, user-facing failure. The top-level handler prints its message
 * without a stack trace, unlike unexpected errors.
 */
export class CliError extends Error {}
