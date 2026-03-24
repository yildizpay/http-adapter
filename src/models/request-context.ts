/**
 * Carries the safe, non-sensitive metadata about the outbound request that
 * produced a given response or exception.
 *
 * Intentionally excludes request headers and body to prevent accidental
 * exposure of auth tokens, API keys, or PII in logs and error reports.
 */
export interface RequestContext {
  method?: string;
  url?: string;
  correlationId?: string;
}
