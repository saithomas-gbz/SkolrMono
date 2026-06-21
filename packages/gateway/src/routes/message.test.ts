import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { relayMessageWs, type WsConnection } from './message';
import type { FastifyRequest } from 'fastify';

class FakeUpstream {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readyState = FakeUpstream.CONNECTING;
  url: string;
  send = mock();
  close = mock();
  private listeners: Record<string, ((event: unknown) => void)[]> = {};

  constructor(url: string | URL) {
    this.url = url.toString();
  }

  addEventListener(event: string, cb: (event: unknown) => void) {
    (this.listeners[event] ??= []).push(cb);
  }

  dispatch(event: string, payload: unknown = {}) {
    for (const cb of this.listeners[event] ?? []) cb(payload);
  }

  simulateOpen() {
    this.readyState = FakeUpstream.OPEN;
    this.dispatch('open');
  }
}

let originalWebSocket: typeof WebSocket;

beforeEach(() => {
  originalWebSocket = globalThis.WebSocket;
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeUpstream;
});

afterEach(() => {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = originalWebSocket;
});

function buildSocket(): WsConnection & { listeners: Record<string, (...args: unknown[]) => void> } {
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  return {
    send: mock(),
    close: mock(),
    on: mock((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = cb;
    }),
    listeners,
  };
}

function buildRequest(token?: string): FastifyRequest {
  return { query: { token } } as unknown as FastifyRequest;
}

describe('relayMessageWs', () => {
  it('forwards the token query param to the upstream message-service URL', () => {
    const socket = buildSocket();
    const request = buildRequest('abc123');

    const upstream = relayMessageWs('ws://message-service:3010', socket, request) as unknown as FakeUpstream;

    expect(upstream.url).toBe('ws://message-service:3010/ws?token=abc123');
  });

  it('omits the token param when no token is provided', () => {
    const socket = buildSocket();
    const request = buildRequest();

    const upstream = relayMessageWs('ws://message-service:3010', socket, request) as unknown as FakeUpstream;

    expect(upstream.url).toBe('ws://message-service:3010/ws');
  });

  it('queues client messages until the upstream connection is open, then flushes them', () => {
    const socket = buildSocket();
    const request = buildRequest('tok');

    const upstream = relayMessageWs('ws://message-service:3010', socket, request) as unknown as FakeUpstream;

    socket.listeners.message(Buffer.from('hello'));
    expect(upstream.send).not.toHaveBeenCalled();

    upstream.simulateOpen();
    expect(upstream.send).toHaveBeenCalledWith('hello');
  });

  it('forwards client messages directly once the upstream is already open', () => {
    const socket = buildSocket();
    const request = buildRequest('tok');

    const upstream = relayMessageWs('ws://message-service:3010', socket, request) as unknown as FakeUpstream;
    upstream.simulateOpen();

    socket.listeners.message(Buffer.from('hi'));

    expect(upstream.send).toHaveBeenCalledWith('hi');
  });

  it('forwards upstream messages back to the client socket', () => {
    const socket = buildSocket();
    const request = buildRequest('tok');

    const upstream = relayMessageWs('ws://message-service:3010', socket, request) as unknown as FakeUpstream;

    upstream.dispatch('message', { data: 'pushed' });

    expect(socket.send).toHaveBeenCalledWith('pushed');
  });

  it('closes the client socket when the upstream closes', () => {
    const socket = buildSocket();
    const request = buildRequest('tok');

    const upstream = relayMessageWs('ws://message-service:3010', socket, request) as unknown as FakeUpstream;
    upstream.dispatch('close');

    expect(socket.close).toHaveBeenCalled();
  });

  it('closes the upstream connection when the client socket closes', () => {
    const socket = buildSocket();
    const request = buildRequest('tok');

    const upstream = relayMessageWs('ws://message-service:3010', socket, request) as unknown as FakeUpstream;
    socket.listeners.close();

    expect(upstream.close).toHaveBeenCalled();
  });
});
