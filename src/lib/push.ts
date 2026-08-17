import webpush from "web-push";
import { PushSubscriptionData } from "./types";

const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
const subject =
  process.env.VAPID_SUBJECT ?? "mailto:admin@red-emergencias.app";

const configured =
  Boolean(publicKey) && Boolean(privateKey);

if (configured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
}

export function pushConfigured(): boolean {
  return configured;
}

export function publicVapidKey(): string {
  return publicKey ?? "";
}

export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionData[],
  payload: { title: string; body: string; url?: string; critical?: boolean },
): Promise<number> {
  if (!configured) return 0;
  const text = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        } as webpush.PushSubscription,
        text,
        { TTL: 3600 },
      ),
    ),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}