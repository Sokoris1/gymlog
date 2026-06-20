import { apiRequest } from "./queryClient";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

/** True if the browser currently holds an active push subscription. */
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await getRegistration();
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * Request permission, subscribe via the server's VAPID key, and persist the
 * subscription (plus the browser timezone) on the server.
 * Returns true on success. Throws a user-presentable Error on failure.
 */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) throw new Error("unsupported");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");

  const keyRes = await apiRequest("GET", "/api/push/public-key").then(r => r.json());
  if (!keyRes?.key || !keyRes?.enabled) throw new Error("server_not_configured");

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.key),
    });
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await apiRequest("POST", "/api/push/subscribe", { subscription: sub.toJSON(), tz });
  return true;
}

/** Unsubscribe locally and remove the subscription from the server. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await apiRequest("POST", "/api/push/unsubscribe", { endpoint }).catch(() => {});
  }
}
