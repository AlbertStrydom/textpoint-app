import { type Server as HttpServer } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "../shared/const";
import { getUserBySessionToken } from "./auth/db";
import { logger } from "./_core/logger";

// ---------------------------------------------------------------------------
// Typed WebSocket events
// ---------------------------------------------------------------------------

type WsEvent =
  | { type: "notification"; payload: { id: number; title: string; message: string; priority?: string } }
  | { type: "notification_count"; payload: { unread: number } }
  | { type: "escalation_alert"; payload: { equipmentId: number; equipmentName: string; escalationLevel: number } }
  | { type: "ping" }
  | { type: "error"; payload: { message: string } };

// ---------------------------------------------------------------------------
// Client connection tracking
// ---------------------------------------------------------------------------

interface AuthenticatedClient {
  ws: WebSocket;
  userId: number;
  userEmail: string;
  userRole: string;
  subscribedAt: Date;
}

const clients = new Map<number, Set<AuthenticatedClient>>();

function getUserId(client: AuthenticatedClient) {
  return client.userId;
}

function addClient(client: AuthenticatedClient) {
  const userId = getUserId(client);
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(client);
}

function removeClient(client: AuthenticatedClient) {
  const userId = getUserId(client);
  const userClients = clients.get(userId);
  if (!userClients) return;
  userClients.delete(client);
  if (userClients.size === 0) {
    clients.delete(userId);
  }
}

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

function sendToClient(client: AuthenticatedClient, event: WsEvent) {
  if (client.ws.readyState === 1) {
    client.ws.send(JSON.stringify(event));
  }
}

export function sendToUser(userId: number, event: WsEvent) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  for (const client of userClients) {
    sendToClient(client, event);
  }
}

export function sendToRole(role: string, event: WsEvent) {
  for (const [, userClients] of clients) {
    for (const client of userClients) {
      if (client.userRole === role) {
        sendToClient(client, event);
      }
    }
  }
}

export function broadcast(event: WsEvent) {
  for (const [, userClients] of clients) {
    for (const client of userClients) {
      sendToClient(client, event);
    }
  }
}

// ---------------------------------------------------------------------------
// Server initialisation
// ---------------------------------------------------------------------------

export function setupWebSocket(httpServer: HttpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    maxPayload: 64 * 1024,
  });

  wss.on("connection", async (ws, req) => {
    const ip = req.socket.remoteAddress ?? "unknown";
    const cookies = parseCookie(req.headers.cookie ?? "");
    const sessionToken = cookies[COOKIE_NAME];

    if (!sessionToken) {
      ws.send(JSON.stringify({ type: "error", payload: { message: "Authentication required." } }));
      ws.close(1008, "Unauthenticated");
      return;
    }

    const user = await getUserBySessionToken(sessionToken);
    if (!user) {
      ws.send(JSON.stringify({ type: "error", payload: { message: "Invalid session." } }));
      ws.close(1008, "Unauthenticated");
      return;
    }

    const client: AuthenticatedClient = {
      ws,
      userId: user.id,
      userEmail: user.email ?? "",
      userRole: user.role,
      subscribedAt: new Date(),
    };

    addClient(client);
    logger.info({ userId: user.id, ip }, "WebSocket client connected");

    // Send initial unread count request — the client will fetch via tRPC
    ws.send(JSON.stringify({ type: "ping" }));

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      } catch {
        logger.warn({ userId: user.id }, "WebSocket received malformed message");
      }
    });

    ws.on("close", (code, reason) => {
      removeClient(client);
      logger.info(
        { userId: user.id, code, reason: reason.toString() },
        "WebSocket client disconnected"
      );
    });

    ws.on("error", (err) => {
      removeClient(client);
      logger.error({ err, userId: user.id }, "WebSocket client error");
    });
  });

  logger.info("WebSocket server initialised at /ws");
  return wss;
}

// ---------------------------------------------------------------------------
// Connector — integrate with existing notification system
// ---------------------------------------------------------------------------

let _wss: WebSocketServer | null = null;

export function getWebSocketServer() {
  return _wss;
}
