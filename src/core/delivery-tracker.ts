import { AsyncLocalStorage } from 'node:async_hooks';
import diagnosticsChannel from 'node:diagnostics_channel';
import type { DeliveryOutcome } from '../exceptions/delivery-outcome';

/**
 * What undici reported for one `fetch()` call. A call can span several requests (redirects);
 * the `hop*` flags describe the current request and are reset when the next one is created.
 */
export interface DeliveryState {
  /** undici created a request for this call. */
  created: boolean;
  /** Request headers or body were written for any request of this call. */
  sent: boolean;
  /** The current request started opening a new connection. */
  hopConnecting: boolean;
  /** The connection for the current request was established. */
  hopConnected: boolean;
  /** Opening the connection for the current request failed. */
  hopConnectFailed: boolean;
  /** Response headers arrived for the current request. */
  hopResponded: boolean;
}

const storage = new AsyncLocalStorage<DeliveryState>();
/** undici request object → the call it belongs to. */
const stateByRequest = new WeakMap<object, DeliveryState>();
let subscribed = false;

/** Per-request events carry undici's request object, which identifies the call reliably. */
function byRequest(update: (state: DeliveryState) => void): (message: unknown) => void {
  return (message) => {
    const request = (message as { request?: object } | undefined)?.request;
    const state = request ? stateByRequest.get(request) : undefined;
    if (state) update(state);
  };
}

/**
 * Connection events carry no request. They are attributed through the async context in which
 * the connection was opened, which is the call that triggered it.
 */
function byContext(update: (state: DeliveryState) => void): (message: unknown) => void {
  return () => {
    const state = storage.getStore();
    if (state) update(state);
  };
}

/**
 * Subscribes once to undici's diagnostics channels. Other `fetch()` users in the process are
 * unaffected: only requests created inside {@link trackDelivery} are recorded.
 */
function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;
  const { subscribe } = diagnosticsChannel;

  // Published synchronously while fetch() dispatches, so the async context is the caller's.
  subscribe('undici:request:create', (message) => {
    const state = storage.getStore();
    const request = (message as { request?: object } | undefined)?.request;
    if (!state || !request) return;
    stateByRequest.set(request, state);
    state.created = true;
    state.hopConnecting = false;
    state.hopConnected = false;
    state.hopConnectFailed = false;
    state.hopResponded = false;
  });
  subscribe(
    'undici:client:beforeConnect',
    byContext((s) => {
      s.hopConnecting = true;
    }),
  );
  subscribe(
    'undici:client:connected',
    byContext((s) => {
      s.hopConnected = true;
    }),
  );
  subscribe(
    'undici:client:connectError',
    byContext((s) => {
      s.hopConnectFailed = true;
    }),
  );
  // Published right before HTTP/1.1 headers are written. HTTP/2 does not publish it, which is
  // why `not_sent` below also requires that no connection was established.
  subscribe(
    'undici:client:sendHeaders',
    byRequest((s) => {
      s.sent = true;
    }),
  );
  subscribe(
    'undici:request:bodySent',
    byRequest((s) => {
      s.sent = true;
    }),
  );
  subscribe(
    'undici:request:headers',
    byRequest((s) => {
      s.sent = true;
      s.hopResponded = true;
    }),
  );
}

/** Creates an empty state for one call. */
export function createDeliveryState(): DeliveryState {
  return {
    created: false,
    sent: false,
    hopConnecting: false,
    hopConnected: false,
    hopConnectFailed: false,
    hopResponded: false,
  };
}

/** Runs `operation` (a `fetch()` call and its body read) while recording events into `state`. */
export function trackDelivery<T>(state: DeliveryState, operation: () => Promise<T>): Promise<T> {
  ensureSubscribed();
  return storage.run(state, operation);
}

/**
 * Derives the outcome of a failed call from what undici reported.
 *
 * - Response headers arrived → `received`.
 * - Headers or body were written, or a connection was established → `unknown`.
 * - Opening a new connection failed, or never finished → `not_sent`.
 * - Anything else, e.g. a request queued on an existing connection → `unknown`.
 *
 * Returns `undefined` when undici reported nothing (diagnostics unavailable, or `fetch` is
 * mocked or polyfilled); the caller then falls back to the error code.
 */
export function deliveryOutcomeOf(state: DeliveryState): DeliveryOutcome | undefined {
  if (!state.created) return undefined;
  if (state.hopResponded) return 'received';
  if (state.sent || state.hopConnected) return 'unknown';
  if (state.hopConnectFailed || state.hopConnecting) return 'not_sent';
  return 'unknown';
}
