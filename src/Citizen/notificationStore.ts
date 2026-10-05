import { useEffect, useState } from "react";

export type NotificationType =
  | "complaint"
  | "emergency"
  | "service"
  | "announcement";

export type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  reference?: string;
};

type NewNotification = Omit<Notification, "id" | "time" | "read">;

const notificationReadEvent = "citizen-notifications-updated";
const notificationCreatedEvent = "citizen-notification-created";

function getCitizenKey() {
  try {
    const savedCitizen = localStorage.getItem("citizen");
    const citizen = savedCitizen ? JSON.parse(savedCitizen) : null;
    return citizen?.citizen_id || "current";
  } catch {
    return "current";
  }
}

function getStorageKey() {
  return `citizen-notifications-${getCitizenKey()}`;
}

function getPendingToastKey() {
  return `citizen-notification-toast-${getCitizenKey()}`;
}

function isNotification(value: unknown): value is Notification {
  if (!value || typeof value !== "object") {
    return false;
  }

  const notification = value as Partial<Notification>;
  return (
    typeof notification.id === "number" &&
    ["complaint", "emergency", "service", "announcement"].includes(
      notification.type || "",
    ) &&
    typeof notification.title === "string" &&
    typeof notification.message === "string" &&
    typeof notification.time === "string" &&
    typeof notification.read === "boolean"
  );
}

export function loadNotifications(): Notification[] {
  try {
    const saved = localStorage.getItem(getStorageKey());
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter(isNotification) : [];
  } catch (error) {
    console.error("Unable to load citizen notifications:", error);
    return [];
  }
}

export function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(notifications));
    window.dispatchEvent(new Event(notificationReadEvent));
  } catch (error) {
    console.error("Unable to save citizen notifications:", error);
  }
}

export function addNotification(notification: NewNotification) {
  const savedNotification: Notification = {
    ...notification,
    id: Date.now(),
    time: "Just now",
    read: false,
  };
  const notifications = loadNotifications();
  saveNotifications([savedNotification, ...notifications]);

  try {
    sessionStorage.setItem(
      getPendingToastKey(),
      JSON.stringify({ notification: savedNotification, createdAt: Date.now() }),
    );
  } catch (error) {
    console.error("Unable to save notification popup:", error);
  }

  window.dispatchEvent(
    new CustomEvent<Notification>(notificationCreatedEvent, {
      detail: savedNotification,
    }),
  );
}

export function consumePendingNotificationToast(): Notification | null {
  try {
    const key = getPendingToastKey();
    const saved = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!saved) {
      return null;
    }

    const parsed: unknown = JSON.parse(saved);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("notification" in parsed) ||
      !("createdAt" in parsed) ||
      typeof parsed.createdAt !== "number" ||
      Date.now() - parsed.createdAt > 15_000 ||
      !isNotification(parsed.notification)
    ) {
      return null;
    }

    return parsed.notification;
  } catch (error) {
    console.error("Unable to load notification popup:", error);
    return null;
  }
}

export function clearPendingNotificationToast() {
  try {
    sessionStorage.removeItem(getPendingToastKey());
  } catch (error) {
    console.error("Unable to clear notification popup:", error);
  }
}

export function getNotificationCreatedEventName() {
  return notificationCreatedEvent;
}

export function useUnreadNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(() =>
    loadNotifications().filter((notification) => !notification.read).length,
  );

  useEffect(() => {
    const refreshUnreadCount = () => {
      setUnreadCount(
        loadNotifications().filter((notification) => !notification.read).length,
      );
    };

    window.addEventListener(notificationReadEvent, refreshUnreadCount);
    window.addEventListener("storage", refreshUnreadCount);

    return () => {
      window.removeEventListener(notificationReadEvent, refreshUnreadCount);
      window.removeEventListener("storage", refreshUnreadCount);
    };
  }, []);

  return unreadCount;
}
