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

const notificationReadEvent = "citizen-notifications-updated";

const defaultNotifications: Notification[] = [
  {
    id: 1,
    type: "complaint",
    title: "Complaint Status Updated",
    message:
      "Your complaint SC-00011 has been received and is currently pending review.",
    time: "10 minutes ago",
    read: false,
    reference: "SC-00011",
  },
  {
    id: 2,
    type: "complaint",
    title: "Complaint Submitted Successfully",
    message:
      "Your street light complaint has been successfully submitted to Smart City.",
    time: "2 hours ago",
    read: false,
    reference: "SC-00011",
  },
  {
    id: 3,
    type: "emergency",
    title: "Emergency Response Team Assigned",
    message:
      "A response team has been assigned to your emergency request.",
    time: "Yesterday",
    read: false,
    reference: "EM-0007",
  },
  {
    id: 4,
    type: "service",
    title: "Water Supply Update",
    message:
      "Water supply maintenance is scheduled in your area tomorrow.",
    time: "2 days ago",
    read: true,
  },
  {
    id: 5,
    type: "announcement",
    title: "Smart City Announcement",
    message:
      "New citizen services are now available through the Smart City portal.",
    time: "3 days ago",
    read: true,
  },
];

function getStorageKey() {
  try {
    const savedCitizen = localStorage.getItem("citizen");
    const citizen = savedCitizen ? JSON.parse(savedCitizen) : null;
    return `citizen-notifications-read-${citizen?.citizen_id || "current"}`;
  } catch {
    return "citizen-notifications-read-current";
  }
}

function getReadState(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(getStorageKey());
    const parsed: unknown = saved ? JSON.parse(saved) : {};

    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, boolean>)
      : {};
  } catch {
    return {};
  }
}

export function loadNotifications(): Notification[] {
  const readState = getReadState();

  return defaultNotifications.map((notification) => ({
    ...notification,
    read: readState[notification.id] ?? notification.read,
  }));
}

export function saveNotifications(notifications: Notification[]) {
  const readState = Object.fromEntries(
    notifications.map(({ id, read }) => [id, read]),
  );

  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(readState));
    window.dispatchEvent(new Event(notificationReadEvent));
  } catch (error) {
    console.error("Unable to save notification read status:", error);
  }
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