import webpush from "web-push";
import { storage } from "./storage";

let configured = false;

export function initPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    console.warn("[push] VAPID keys not set — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  console.log("[push] VAPID configured");
}

export function isPushConfigured() {
  return configured;
}

export function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push to every subscription a user has. Prunes subscriptions that the
 * push service reports as gone (404/410).
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!configured) return 0;
  const subs = await storage.getPushSubscriptions(userId);
  if (subs.length === 0) return 0;

  const data = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        );
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired/unsubscribed — remove it.
          await storage.deletePushSubscription(sub.endpoint).catch(() => {});
        } else {
          console.error("[push] send failed:", status, err?.body ?? err?.message);
        }
      }
    }),
  );

  return sent;
}
