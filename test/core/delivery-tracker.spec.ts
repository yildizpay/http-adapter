import diagnosticsChannel from 'node:diagnostics_channel';
import { describe, expect, it } from 'vitest';
import {
  createDeliveryState,
  type DeliveryState,
  deliveryOutcomeOf,
  trackDelivery,
} from '../../src/core/delivery-tracker';

type Step = [event: string, request?: object];

const publish = (event: string, request?: object) =>
  diagnosticsChannel.channel(`undici:${event}`).publish(request ? { request } : {});

/** Replays undici events inside a tracked call and returns the resulting state. */
async function replay(steps: Step[]): Promise<DeliveryState> {
  const state = createDeliveryState();
  await trackDelivery(state, async () => {
    for (const [event, request] of steps) publish(event, request);
  });
  return state;
}

describe('delivery tracker', () => {
  const req = {};

  it('reports nothing when undici published no request', async () => {
    expect(deliveryOutcomeOf(await replay([]))).toBeUndefined();
  });

  it('is not_sent when opening the connection failed', async () => {
    const state = await replay([
      ['request:create', req],
      ['client:beforeConnect'],
      ['client:connectError'],
    ]);
    expect(deliveryOutcomeOf(state)).toBe('not_sent');
  });

  it('is not_sent when the connection never finished opening', async () => {
    const state = await replay([['request:create', req], ['client:beforeConnect']]);
    expect(deliveryOutcomeOf(state)).toBe('not_sent');
  });

  it('is unknown once a connection was established, even without sendHeaders (HTTP/2)', async () => {
    const state = await replay([
      ['request:create', req],
      ['client:beforeConnect'],
      ['client:connected'],
    ]);
    expect(deliveryOutcomeOf(state)).toBe('unknown');
  });

  it.each(['client:sendHeaders', 'request:bodySent'])('is unknown after %s', async (event) => {
    const r = {};
    expect(
      deliveryOutcomeOf(
        await replay([
          ['request:create', r],
          [event, r],
        ]),
      ),
    ).toBe('unknown');
  });

  it('is unknown for a request queued on an existing connection', async () => {
    expect(deliveryOutcomeOf(await replay([['request:create', req]]))).toBe('unknown');
  });

  it('is received once response headers arrived', async () => {
    const r = {};
    const state = await replay([
      ['request:create', r],
      ['client:sendHeaders', r],
      ['request:headers', r],
    ]);
    expect(deliveryOutcomeOf(state)).toBe('received');
  });

  it('attributes request events by request object, outside the async context', async () => {
    const r = {};
    const state = await replay([['request:create', r]]);

    publish('client:sendHeaders', r);
    publish('request:headers', r);

    expect(deliveryOutcomeOf(state)).toBe('received');
  });

  it('ignores request events of requests it did not create', async () => {
    const state = await replay([['request:create', req], ['client:beforeConnect']]);

    publish('client:sendHeaders', {});
    publish('request:headers');

    expect(deliveryOutcomeOf(state)).toBe('not_sent');
  });

  it('ignores events outside a tracked call', () => {
    expect(() => {
      publish('request:create', {});
      publish('client:beforeConnect');
    }).not.toThrow();
  });

  it('ignores request:create messages without a request', async () => {
    expect(deliveryOutcomeOf(await replay([['request:create']]))).toBeUndefined();
  });

  describe('redirects', () => {
    it('is unknown when an earlier hop was answered and the next one fails to connect', async () => {
      const first = {};
      const second = {};
      const state = await replay([
        ['request:create', first],
        ['client:sendHeaders', first],
        ['request:headers', first],
        ['request:create', second],
        ['client:beforeConnect'],
        ['client:connectError'],
      ]);
      expect(deliveryOutcomeOf(state)).toBe('unknown');
    });
  });
});
