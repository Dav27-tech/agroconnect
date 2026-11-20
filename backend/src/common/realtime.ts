import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { Security, UserRoleType } from './security.js';
import { dbManager } from '../database/client.js';

interface RealtimeIdentity {
  userId: string;
  roles: UserRoleType[];
  sellerId?: string;
  expiresAt: number;
}

export interface InventoryUpdate {
  offerId: string;
  stockQuantity: number;
  isAvailable: boolean;
}

export interface OrderCreatedEvent {
  orderId: string;
  orderNumber: string;
  buyerId: string;
  subOrders: Array<{ id: string; sellerId: string; status: string }>;
}

export interface OrderUpdatedEvent {
  orderId: string;
  subOrderId: string;
  buyerId: string;
  sellerId: string;
  status: string;
  payoutStatus?: string;
}

export interface DeliveryUpdatedEvent extends OrderUpdatedEvent {
  deliveryId: string;
  deliveryStatus: string;
  courierUserId?: string;
}

let realtimeServer: Server | null = null;

export function initializeRealtime(server: HttpServer): Server {
  if (realtimeServer) throw new Error('Socket.IO a déjà été initialisé.');
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
      methods: ['GET', 'POST'],
    },
    serveClient: false,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token === undefined || token === null || token === '') {
      socket.data.identity = null;
      next();
      return;
    }
    if (typeof token !== 'string') {
      next(new Error('Jeton Socket.IO invalide.'));
      return;
    }

    const payload = Security.verifyToken(token);
    if (!payload) {
      next(new Error('Session Socket.IO invalide ou expirée.'));
      return;
    }

    try {
      const users = await dbManager.query<{
        id: string;
        roles: UserRoleType[];
        isActive: boolean;
      }>(
        `SELECT "id", "roles"::text[] AS "roles", "isActive"
         FROM "users" WHERE "id" = $1 LIMIT 1`,
        [payload.userId]
      );
      const user = users.rows[0];
      if (!user || !user.isActive) {
        next(new Error('Compte introuvable ou désactivé.'));
        return;
      }

      let sellerId: string | undefined;
      if (user.roles.includes('SELLER')) {
        const sellers = await dbManager.query<{ id: string }>(
          `SELECT "id" FROM "seller_profiles" WHERE "userId" = $1 LIMIT 1`,
          [user.id]
        );
        sellerId = sellers.rows[0]?.id;
      }
      socket.data.identity = {
        userId: user.id,
        roles: user.roles,
        sellerId,
        expiresAt: payload.exp * 1000,
      } satisfies RealtimeIdentity;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error('Authentification Socket.IO impossible.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('catalogue');
    const identity = socket.data.identity as RealtimeIdentity | null;
    if (!identity) return;

    const expiryTimer = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, identity.expiresAt - Date.now())
    );
    socket.once('disconnect', () => clearTimeout(expiryTimer));
    socket.join(`user:${identity.userId}`);
    if (identity.sellerId) socket.join(`seller:${identity.sellerId}`);
    if (identity.roles.includes('ADMIN') || identity.roles.includes('SUPER_ADMIN')) {
      socket.join('role:admin');
    }
    if (identity.roles.includes('DELIVERY_PERSON')) socket.join('role:courier');
  });

  realtimeServer = io;
  return io;
}

export function closeRealtime(): Promise<void> {
  if (!realtimeServer) return Promise.resolve();
  const server = realtimeServer;
  realtimeServer = null;
  return new Promise((resolve) => server.close(() => resolve()));
}

export function disconnectRealtimeUser(userId: string): void {
  realtimeServer?.in(`user:${userId}`).disconnectSockets(true);
}

export function publishInventoryUpdated(offers: InventoryUpdate[]): void {
  if (!realtimeServer || offers.length === 0) return;
  realtimeServer.to('catalogue').emit('inventory.updated', { offers });
}

export function publishOrderCreated(order: OrderCreatedEvent, inventory: InventoryUpdate[]): void {
  if (!realtimeServer) return;
  const event = {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    buyerId: order.buyerId,
  };
  realtimeServer.to(`user:${order.buyerId}`).emit('order.created', event);
  realtimeServer.to('role:admin').emit('order.created', event);
  order.subOrders.forEach((subOrder) => {
    realtimeServer?.to(`seller:${subOrder.sellerId}`).emit('order.created', {
      ...event,
      subOrderId: subOrder.id,
      status: subOrder.status,
    });
  });
  publishInventoryUpdated(inventory);
}

export function publishOrderUpdated(event: OrderUpdatedEvent): void {
  if (!realtimeServer) return;
  realtimeServer.to(`user:${event.buyerId}`).emit('order.updated', event);
  realtimeServer.to(`seller:${event.sellerId}`).emit('order.updated', event);
  realtimeServer.to('role:admin').emit('order.updated', event);
}

export function publishDeliveryUpdated(event: DeliveryUpdatedEvent): void {
  if (!realtimeServer) return;
  realtimeServer.to(`user:${event.buyerId}`).emit('delivery.updated', event);
  realtimeServer.to(`seller:${event.sellerId}`).emit('delivery.updated', event);
  realtimeServer.to('role:admin').emit('delivery.updated', event);
  if (event.courierUserId) realtimeServer.to(`user:${event.courierUserId}`).emit('delivery.updated', event);
  const orderEvent: OrderUpdatedEvent = {
    orderId: event.orderId,
    subOrderId: event.subOrderId,
    buyerId: event.buyerId,
    sellerId: event.sellerId,
    status: event.status,
    payoutStatus: event.payoutStatus,
  };
  publishOrderUpdated(orderEvent);
}
