/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import type { Notification } from './AccreditationAnalyzer';
import './NotificationsModal.css'; // Create this CSS file

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onClearRead: () => void;
  title?: string;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearRead,
  title = "Notifications"
}) => {
  if (!isOpen) return null;

  const hasUnread = notifications.some(n => !n.isRead);
  const hasRead = notifications.some(n => n.isRead);

  return (
    <div className="modal-overlay notifications-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="notifications-modal-title">
      <div className="modal-content notifications-modal-content">
        <header className="modal-header">
          <h3 id="notifications-modal-title">{title}</h3>
          <button onClick={onClose} className="close-modal-button" aria-label="Close notifications">
            <span className="icon">close</span>
          </button>
        </header>

        <div className="modal-body notifications-list-container">
          {notifications.length === 0 ? (
            <p>No notifications.</p>
          ) : (
            <ul className="notifications-list">
              {notifications.map(notification => (
                <li key={notification.id} className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}>
                  <div className="notification-icon-area">
                    <span className="icon">{notification.isRead ? 'drafts' : 'notifications_active'}</span>
                  </div>
                  <div className="notification-details">
                    <p className="notification-message">{notification.message}</p>
                    <p className="notification-timestamp">{new Date(notification.timestamp).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="modal-footer">
          {notifications.some(n => n.isRead) && (
             <button onClick={onClearRead} className="action-button clear-read-button">
                <span className="icon">delete_sweep</span> Clear Read Notifications
            </button>
          )}
          <button onClick={onClose} className="action-button">Close</button>
        </footer>
      </div>
    </div>
  );
};

export default NotificationsModal;