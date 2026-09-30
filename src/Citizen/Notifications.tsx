import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CitizenNavbar, CitizenSidebar } from "./CitizenNavigation";
import "./Citizenportal.css";
import "./Notifications.css";

type NotificationType =
  | "complaint"
  | "emergency"
  | "service"
  | "announcement";

type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  reference?: string;
};

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

  const [notifications, setNotifications] = useState<Notification[]>([
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
  ]);

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
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "complaint":
        return "▣";
      case "emergency":
        return "!";
      case "service":
        return "◉";
      case "announcement":
        return "▤";
      default:
        return "•";
    }
  };

  const handleNavigation = (label: string) => {
    if (label === "Notifications") return;

    if (label === "Logout") {
      localStorage.removeItem("citizen");
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
          ✓ Mark all as read
        </button>

      </div>

      {/* ================= SUMMARY ================= */}

      <div className="notification-summary">

        <div className="summary-icon">
          🔔
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
                🔔
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
                  →
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