import { describe, it, expect, mock } from 'bun:test';
import * as presence from '../utils/presence';

function buildSocket(readyState = 1) {
  return {
    readyState,
    OPEN: 1,
    send: mock(),
  };
}

describe('presence', () => {
  it('marks a user online once a connection is registered', () => {
    const socket = buildSocket();
    expect(presence.isOnline('user-1')).toBe(false);
    presence.addConnection('user-1', socket);
    expect(presence.isOnline('user-1')).toBe(true);
  });

  it('marks a user offline once all connections are removed', () => {
    const socket = buildSocket();
    presence.addConnection('user-2', socket);
    presence.removeConnection('user-2', socket);
    expect(presence.isOnline('user-2')).toBe(false);
  });

  it('keeps a user online while at least one connection remains (multi-onglet)', () => {
    const socketA = buildSocket();
    const socketB = buildSocket();
    presence.addConnection('user-3', socketA);
    presence.addConnection('user-3', socketB);
    presence.removeConnection('user-3', socketA);
    expect(presence.isOnline('user-3')).toBe(true);
  });

  it('counts the sockets still open for a user', () => {
    const socketA = buildSocket();
    const socketB = buildSocket();
    expect(presence.connectionCount('user-count')).toBe(0);
    presence.addConnection('user-count', socketA);
    presence.addConnection('user-count', socketB);
    expect(presence.connectionCount('user-count')).toBe(2);
    presence.removeConnection('user-count', socketA);
    expect(presence.connectionCount('user-count')).toBe(1);
  });

  it('broadcasts to several users at once and ignores duplicates', () => {
    const socketA = buildSocket();
    const socketB = buildSocket();
    presence.addConnection('user-multi-1', socketA);
    presence.addConnection('user-multi-2', socketB);

    presence.sendToUsers(['user-multi-1', 'user-multi-2', 'user-multi-1'], { type: 'ping' });

    expect(socketA.send).toHaveBeenCalledTimes(1);
    expect(socketB.send).toHaveBeenCalledTimes(1);
    expect(socketA.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
  });

  it('reports presence for a list of userIds', () => {
    const socket = buildSocket();
    presence.addConnection('user-4', socket);

    const result = presence.getPresence(['user-4', 'user-5']);

    expect(result).toEqual([
      { userId: 'user-4', online: true, lastSeen: expect.any(Number) },
      { userId: 'user-5', online: false, lastSeen: null },
    ]);
  });

  it('sends a payload only to open sockets of a user', () => {
    const openSocket = buildSocket(1);
    const closedSocket = buildSocket(3);
    presence.addConnection('user-6', openSocket);
    presence.addConnection('user-6', closedSocket);

    presence.sendToUser('user-6', { type: 'message', data: { id: 'm-1' } });

    expect(openSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'message', data: { id: 'm-1' } }));
    expect(closedSocket.send).not.toHaveBeenCalled();
  });

  it('does nothing when sending to a user with no connections', () => {
    expect(() => presence.sendToUser('user-unknown', { type: 'message' })).not.toThrow();
  });
});
