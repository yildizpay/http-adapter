export const DEFAULT_CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Correlation ID propagation configuration.
 *
 * Used both at the adapter level (global default) and at the request level (per-request override).
 * When `enabled` is `true`, the correlation ID is forwarded as an outgoing request header.
 * The `header` field is optional and falls back to `x-correlation-id` when omitted.
 */
export interface CorrelationIdConfig {
  /** Whether to propagate the correlation ID. */
  enabled: boolean;
  /**
   * The header name to use.
   * Falls back to the adapter-level header, then to `'x-correlation-id'`, when omitted.
   */
  header?: string;
}
