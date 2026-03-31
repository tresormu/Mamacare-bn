import { Response } from 'express';

// doctorId -> set of active SSE response streams
const clients = new Map<string, Set<Response>>();

export function addClient(doctorId: string, res: Response) {
  if (!clients.has(doctorId)) clients.set(doctorId, new Set());
  clients.get(doctorId)!.add(res);
}

export function removeClient(doctorId: string, res: Response) {
  clients.get(doctorId)?.delete(res);
}

export function sendToDoctor(doctorId: string, event: string, data: unknown) {
  const streams = clients.get(doctorId);
  if (!streams?.size) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of streams) {
    res.write(payload);
  }
}
