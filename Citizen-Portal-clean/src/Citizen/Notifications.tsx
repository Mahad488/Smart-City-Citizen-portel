import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Megaphone,
  MessageSquare,
  Wrench,
} from "lucide-react";
import { CitizenNavbar, CitizenSidebar } from "./CitizenNavigation";
import {
  loadNotifications,
  saveNotifications,
  type Notification,
  type NotificationType,
} from "./notificationStore";
import "./Citizenportal.css";
import "./Notifications.css";

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [citizen] = useState(() => {
    try {
      const saved = localStorage.getItem("citizen");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeFilter, setActiveFilter] = useState("All");

  const [notifications, setNotifications] = useState<Notification[]>(
    loadNotifications,
  );

  const filters = [
    "All",
    "Complaints",
    "Emergencies",
    "Services",
    "Announcements",
  ];

  const getFilterType = (filter: string) => {
    switch (filter) {
      case "Complaints":
        return "complaint";
      case "Emergencies":
        return "emergency";
      case "Services":
        return "service";
      case "Announcements":
        return "announcement";
      default:
        return "all";
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const type = getFilterType(activeFilter);

    if (type === "all") {
      return true;
    }

    return notification.type === type;
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const markAsRead = (id: number) => {
    const updated = notifications.map((notification) =>
      notification.id === id
        ? { ...notification, read: true }
        : notification,
    );
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((notification) => ({
      ...notification,
      read: true,
    }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "complaint":
        return <MessageSquare aria-hidden="true" />;
      case "emergency":
        return <AlertTriangle aria-hidden="true" />;
      case "service":
        return <Wrench aria-hidden="true" />;
      case "announcement":
        return <Megaphone aria-hidden="true" />;
      default:
        return <Bell aria-hidden="true" />;
    }
  };

  const handleNavigation = (label: string) => {
    if (label === "Notifications") return;

    if (label === "Logout") {
      localStorage.removeItem("citizen");
      localStorage.removeItem("citizen_token");
      navigate("/citizen-login");
      return;
    }

    if (label === "My Complaints") {
      navigate("/citizen-my-complaints");
      return;
    }

    if (label === "New Complaint") {
      navigate("/citizen-new-complaint");
      return;
    }

    if (label === "Emergency") {
      navigate("/citizen-emergency");
      return;
    }

    navigate("/citizen-portal");
  };

  return (
    <div className="citizen-dashboard">
      <CitizenSidebar
        activeItem="Notifications"
        onNavigate={handleNavigation}
        notificationCount={unreadCount}
      />

      <main className="dashboard-main">
        <CitizenNavbar citizenName={citizen?.name || "Citizen"} />

        <div className="notifications-page">

      {/* ================= HEADER ================= */}

      <div className="notifications-header">

        <div>
          <h1>Notifications</h1>

          <p>
            Stay updated with your complaints, emergencies and city services.
          </p>
        </div>

        <button
          className="mark-all-button"
          onClick={markAllAsRead}
        >
          <Check size={16} aria-hidden="true" /> Mark all as read
        </button>

      </div>

      {/* ================= SUMMARY ================= */}

      <div className="notification-summary">

        <div className="summary-icon">
          <Bell size={22} aria-hidden="true" />
        </div>

        <div>
          <strong>
            {unreadCount} Unread Notifications
          </strong>

          <p>
            You have {unreadCount} new updates that need your attention.
          </p>
        </div>

      </div>

      {/* ================= FILTERS ================= */}

      <div className="notification-filters">

        {filters.map((filter) => (
          <button
            key={filter}
            className={
              activeFilter === filter
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => setActiveFilter(filter)}
          >
            {filter}

            {filter === "All" && (
              <span className="filter-count">
                {notifications.length}
              </span>
            )}
          </button>
        ))}

      </div>

      {/* ================= NOTIFICATION CARD ================= */}

      <section className="notifications-card">

        <div className="notifications-card-header">

          <div>
            <h2>
              Recent Notifications
            </h2>

            <p>
              Your latest Smart City portal updates.
            </p>
          </div>

          <span className="notification-record-count">
            {filteredNotifications.length} Notifications
          </span>

        </div>

        <div className="notification-list">

          {filteredNotifications.length === 0 ? (

            <div className="empty-notifications">

              <div className="empty-icon">
                <Bell size={24} aria-hidden="true" />
              </div>

              <h3>
                No Notifications
              </h3>

              <p>
                There are no notifications in this category.
              </p>

            </div>

          ) : (

            filteredNotifications.map((notification) => (

              <div
                key={notification.id}
                className={
                  notification.read
                    ? "notification-item"
                    : "notification-item unread"
                }
                onClick={() => markAsRead(notification.id)}
              >

                {/* Icon */}

                <div
                  className={`notification-icon ${notification.type}`}
                >
                  {getIcon(notification.type)}
                </div>

                {/* Content */}

                <div className="notification-content">

                  <div className="notification-title-row">

                    <h3>
                      {notification.title}
                    </h3>

                    {!notification.read && (
                      <span className="unread-dot"></span>
                    )}

                  </div>

                  <p>
                    {notification.message}
                  </p>

                  <div className="notification-meta">

                    <span>
                      {notification.time}
                    </span>

                    {notification.reference && (
                      <>
                        <span className="meta-separator">
                          •
                        </span>

                        <span>
                          {notification.reference}
                        </span>
                      </>
                    )}

                  </div>

                </div>

                {/* Arrow */}

                <div className="notification-arrow">
                  <ArrowRight size={16} aria-hidden="true" />
                </div>

              </div>

            ))

          )}

        </div>

      </section>

        </div>
      </main>
    </div>
  );
};

export default Notifications;