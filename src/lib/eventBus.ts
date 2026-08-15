import Redis from "ioredis";

/**
 * Bus de eventos pub/sub.
 * En monoproceso usa memoria; si hay REDIS_URL, propaga eventos entre
 * instancias (Next.js serverless / múltiples nodos).
 */
export interface EventBus {
  publish(payload: string): Promise<void>;
  subscribe(onMessage: (payload: string) => void): Promise<() => void>;
  dispose(): Promise<void>;
}

const CHANNEL = "emergiayuda:events";

class MemoryEventBus implements EventBus {
  private handlers = new Set<(payload: string) => void>();

  async publish(payload: string) {
    for (const h of this.handlers) h(payload);
  }

  async subscribe(onMessage: (payload: string) => void) {
    this.handlers.add(onMessage);
    return () => {
      this.handlers.delete(onMessage);
    };
  }

  async dispose() {
    this.handlers.clear();
  }
}

class RedisEventBus implements EventBus {
  private pub: Redis;
  private sub: Redis;
  private subscribed = false;
  private handlers = new Set<(payload: string) => void>();

  constructor(url: string) {
    this.pub = new Redis(url, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    this.sub = this.pub.duplicate();
    this.sub.on("message", (_channel: string, message: string) => {
      for (const h of this.handlers) h(message);
    });
    this.sub.on("error", () => {
      /* si Redis cae, las instancias no comparten eventos pero siguen vivas */
    });
  }

  async publish(payload: string) {
    try {
      await this.pub.publish(CHANNEL, payload);
    } catch {
      /* sin broker: se pierde la propagación, los clientes locales siguen */
    }
  }

  async subscribe(onMessage: (payload: string) => void) {
    this.handlers.add(onMessage);
    if (!this.subscribed) {
      await this.sub.subscribe(CHANNEL);
      this.subscribed = true;
    }
    return () => {
      this.handlers.delete(onMessage);
    };
  }

  async dispose() {
    try {
      await this.sub.unsubscribe(CHANNEL);
      await this.sub.quit();
      await this.pub.quit();
    } catch {
      /* ignore */
    }
  }
}

let bus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!bus) {
    const url = process.env.REDIS_URL;
    bus = url ? new RedisEventBus(url) : new MemoryEventBus();
  }
  return bus;
}