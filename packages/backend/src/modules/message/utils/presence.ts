type Socket = {
  readyState: number;
  OPEN: number;
  send: (data: string) => void;
};

const userSockets = new Map<string, Set<Socket>>();
const lastSeen = new Map<string, number>();

export function addConnection(userId: string, socket: Socket): void {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socket);
  lastSeen.set(userId, Date.now());
}

export function removeConnection(userId: string, socket: Socket): void {
  userSockets.get(userId)?.delete(socket);
  if (userSockets.get(userId)?.size === 0) {
    userSockets.delete(userId);
  }
  lastSeen.set(userId, Date.now());
}

export function isOnline(userId: string): boolean {
  return (userSockets.get(userId)?.size ?? 0) > 0;
}

/**
 * Nombre de sockets encore ouverts pour cet utilisateur. Un même compte peut
 * en tenir plusieurs (onglets, appareils) : la fermeture de l'un ne signifie
 * pas que l'utilisateur est hors ligne — voir `wsController`.
 */
export function connectionCount(userId: string): number {
  return userSockets.get(userId)?.size ?? 0;
}

export function getPresence(userIds: string[]): { userId: string; online: boolean; lastSeen: number | null }[] {
  return userIds.map((userId) => ({
    userId,
    online: isOnline(userId),
    lastSeen: lastSeen.get(userId) ?? null,
  }));
}

export function sendToUser(userId: string, payload: unknown): void {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return;
  const data = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(data);
  }
}

/** Diffuse à tous les utilisateurs listés (doublons ignorés). */
export function sendToUsers(userIds: string[], payload: unknown): void {
  for (const userId of new Set(userIds)) {
    sendToUser(userId, payload);
  }
}
