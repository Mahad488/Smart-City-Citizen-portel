import { useEffect, useState } from "react";
import { CheckCircle, X, Bell } from "lucide-react";
import {
  getNotificationCreatedEventName,
  type Notification,
} from "../Citizen/notificationStore";
import "./SuccessToast.css";

export function SuccessToast() {
  const [toasts, setToasts] = useState<(Notification & { visible: boolean })[]>(
    []
  );

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      const toastItem = { ...notification, visible: true };

      setToasts((prev) => [...prev, toastItem]);

      // Auto-dismiss after 4.5s
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) =>
            t.id === toastItem.id ? { ...t, visible: false } : t
          )
        );
        // Remove from DOM after fade-out
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastItem.id));
        }, 400);
      }, 4500);
    };

    const eventName = getNotificationCreatedEventName();
    window.addEventListener(eventName, handleNotification);
    return () => window.removeEventListener(eventName, handleNotification);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item ${toast.type} ${toast.visible ? "toast-enter" : "toast-exit"}`}
          role="status"
        >
          <div className="toast-icon">
            {toast.type === "emergency" ? (
              <Bell size={20} aria-hidden="true" />
            ) : (
              <CheckCircle size={20} aria-hidden="true" />
            )}
          </div>

          <div className="toast-body">
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
            {toast.reference && (
              <span className="toast-ref">ID: {toast.reference}</span>
            )}
          </div>

          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
