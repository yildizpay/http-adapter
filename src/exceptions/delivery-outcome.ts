/**
 * Whether a failed request reached the server.
 *
 * - `not_sent` — the request was never written to the network, so it had no effect and can
 *   be sent again, to the same or another provider.
 * - `unknown` — the request may or may not have reached the server. Treat it as possibly
 *   processed: re-sending it (or falling back to another provider) can apply it twice.
 * - `received` — the server answered (an HTTP error status, or a response that failed
 *   validation), so it processed the request in some way.
 *
 * `not_sent` is only reported with positive evidence. Anything uncertain is `unknown`.
 */
export type DeliveryOutcome = 'not_sent' | 'unknown' | 'received';

const OUTCOMES: ReadonlySet<string> = new Set<DeliveryOutcome>(['not_sent', 'unknown', 'received']);

/** Returns `true` when `value` is one of the three {@link DeliveryOutcome} strings. */
export function isDeliveryOutcome(value: unknown): value is DeliveryOutcome {
  return typeof value === 'string' && OUTCOMES.has(value);
}

/**
 * Returns the delivery outcome of any thrown value.
 *
 * Adapter exceptions carry it as `deliveryOutcome`; errors from custom clients may set the same
 * property. Anything else, including errors without a valid outcome, is `unknown`.
 */
export function getDeliveryOutcome(error: unknown): DeliveryOutcome {
  if (typeof error === 'object' && error !== null) {
    const outcome = (error as { deliveryOutcome?: unknown }).deliveryOutcome;
    if (isDeliveryOutcome(outcome)) return outcome;
  }
  return 'unknown';
}

/** `true` when the request provably never reached the server. */
export function isNotSent(error: unknown): boolean {
  return getDeliveryOutcome(error) === 'not_sent';
}

/** `true` when it is unknown whether the request reached the server. */
export function isDeliveryUnknown(error: unknown): boolean {
  return getDeliveryOutcome(error) === 'unknown';
}

/** `true` when the server answered the request. */
export function isReceived(error: unknown): boolean {
  return getDeliveryOutcome(error) === 'received';
}
