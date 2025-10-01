/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import type { User, UserRole } from '../App';
import './InternalMessagesModal.css';

export interface RecipientIdentifier {
    type: 'user' | 'role';
    value: string; // Username or UserRole
}

export interface InternalMessage {
  id: string;
  senderUsername: string;
  senderRole: UserRole;
  recipientIdentifier: RecipientIdentifier;
  subject: string;
  body: string;
  timestamp: string;
  readBy: { [username: string]: boolean }; // Tracks who has read it, mainly for inbox
}

interface InternalMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const LOCAL_STORAGE_INTERNAL_MESSAGES_KEY = 'internalUserMessages';
const ALL_ROLES: UserRole[] = ['Admin', 'University Lead', 'University ID'];

const InternalMessagesModal: React.FC<InternalMessagesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);

  // Compose State
  const [composeRecipientType, setComposeRecipientType] = useState<'role' | 'user'>('role');
  const [composeRecipientRole, setComposeRecipientRole] = useState<UserRole>('Admin');
  const [composeRecipientUser, setComposeRecipientUser] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const loadMessages = useCallback(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_INTERNAL_MESSAGES_KEY);
    const allMsgs: InternalMessage[] = stored ? JSON.parse(stored) : [];
    setMessages(allMsgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      setSelectedMessage(null); // Reset selected message when modal opens/re-opens
      setActiveTab('inbox'); // Default to inbox
    }
  }, [isOpen, loadMessages]);

  const handleSendMessage = () => {
    setComposeError(null);
    if (!composeSubject.trim() || !composeBody.trim()) {
      setComposeError("Subject and body cannot be empty.");
      return;
    }
    let recipientValue = '';
    if (composeRecipientType === 'role') {
        recipientValue = composeRecipientRole;
    } else {
        recipientValue = composeRecipientUser.trim();
        if (!recipientValue) {
            setComposeError("Recipient username cannot be empty.");
            return;
        }
    }

    setIsSending(true);
    const newMessage: InternalMessage = {
      id: crypto.randomUUID(),
      senderUsername: currentUser.username,
      senderRole: currentUser.role,
      recipientIdentifier: { type: composeRecipientType, value: recipientValue },
      subject: composeSubject,
      body: composeBody,
      timestamp: new Date().toISOString(),
      readBy: {}, // Initially unread by anyone
    };

    try {
      const currentMessages = messages; // Use state for current messages to avoid race condition with localStorage
      const updatedMessages = [...currentMessages, newMessage];
      localStorage.setItem(LOCAL_STORAGE_INTERNAL_MESSAGES_KEY, JSON.stringify(updatedMessages));
      setMessages(updatedMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      // Reset compose form
      setComposeSubject('');
      setComposeBody('');
      setComposeRecipientUser('');
      // setComposeRecipientRole('Admin'); // Optionally reset role
      // setComposeRecipientType('role');
      alert("Message sent successfully!");
      setActiveTab('sent'); // Switch to sent tab
    } catch (e: any) {
      console.error("Error sending message:", e);
      setComposeError(`Failed to send message: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const markMessageAsRead = (messageId: string) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const newReadBy = { ...(msg.readBy || {}), [currentUser.username]: true };
        return { ...msg, readBy: newReadBy };
      }
      return msg;
    });
    localStorage.setItem(LOCAL_STORAGE_INTERNAL_MESSAGES_KEY, JSON.stringify(updatedMessages));
    setMessages(updatedMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    // If the currently selected message is the one marked read, update its state too
    if (selectedMessage && selectedMessage.id === messageId) {
        setSelectedMessage(prev => prev ? {...prev, readBy: {...(prev.readBy || {}), [currentUser.username]: true}} : null);
    }
  };

  const handleViewMessage = (message: InternalMessage) => {
    setSelectedMessage(message);
    // If it's an inbox message and unread by current user, mark as read
    const isInboxMessage = (message.recipientIdentifier.type === 'user' && message.recipientIdentifier.value === currentUser.username) ||
                           (message.recipientIdentifier.type === 'role' && message.recipientIdentifier.value === currentUser.role);
    if (isInboxMessage && (!message.readBy || !message.readBy[currentUser.username])) {
      markMessageAsRead(message.id);
    }
  };

  const handleDeleteReadInboxMessages = () => {
    if (!window.confirm("Are you sure you want to delete all read messages from your inbox? This action cannot be undone.")) {
        return;
    }
    const unreadInboxMessages = messages.filter(msg => {
        const isForCurrentUser = (msg.recipientIdentifier.type === 'user' && msg.recipientIdentifier.value === currentUser.username) ||
                                (msg.recipientIdentifier.type === 'role' && msg.recipientIdentifier.value === currentUser.role);
        return isForCurrentUser && (!msg.readBy || !msg.readBy[currentUser.username]);
    });
    const otherMessages = messages.filter(msg => {
        const isForCurrentUser = (msg.recipientIdentifier.type === 'user' && msg.recipientIdentifier.value === currentUser.username) ||
                                (msg.recipientIdentifier.type === 'role' && msg.recipientIdentifier.value === currentUser.role);
        return !isForCurrentUser; // Keep messages not for current user (e.g. sent items, or for other users)
    });

    const messagesToKeep = [...unreadInboxMessages, ...otherMessages];
    localStorage.setItem(LOCAL_STORAGE_INTERNAL_MESSAGES_KEY, JSON.stringify(messagesToKeep));
    setMessages(messagesToKeep.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setSelectedMessage(null); // Clear selected message view
    alert("Read inbox messages deleted.");
  };


  const inboxMessages = messages.filter(m => 
    (m.recipientIdentifier.type === 'user' && m.recipientIdentifier.value === currentUser.username) ||
    (m.recipientIdentifier.type === 'role' && m.recipientIdentifier.value === currentUser.role)
  );
  const sentMessages = messages.filter(m => m.senderUsername === currentUser.username);


  const renderMessageList = (list: InternalMessage[], listType: 'inbox' | 'sent') => {
    if (list.length === 0) {
      return <p>No messages in {listType}.</p>;
    }
    return (
      <ul className="message-list">
        {list.map(msg => {
          const isUnread = listType === 'inbox' && (!msg.readBy || !msg.readBy[currentUser.username]);
          return (
            <li 
                key={msg.id} 
                onClick={() => handleViewMessage(msg)} 
                className={`message-item ${selectedMessage?.id === msg.id ? 'selected' : ''} ${isUnread ? 'unread' : ''}`}
                aria-current={selectedMessage?.id === msg.id ? "true" : undefined}
            >
              <div className="message-item-header">
                <span className="message-sender">
                  {listType === 'inbox' ? `From: ${msg.senderUsername} (${msg.senderRole})` : `To: ${msg.recipientIdentifier.type === 'role' ? `Role: ${msg.recipientIdentifier.value}` : `User: ${msg.recipientIdentifier.value}` }`}
                </span>
                <span className="message-subject">{msg.subject}</span>
              </div>
              <span className="message-timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay internal-messages-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="internal-messages-title">
      <div className="modal-content internal-messages-modal-content">
        <header className="modal-header">
          <h3 id="internal-messages-title">Internal Messages</h3>
          <button onClick={onClose} className="close-modal-button" aria-label="Close internal messages">
            <span className="icon">close</span>
          </button>
        </header>

        <nav className="modal-tabs">
          <button onClick={() => { setActiveTab('inbox'); setSelectedMessage(null);}} className={activeTab === 'inbox' ? 'active' : ''}><span className="icon">inbox</span> Inbox ({inboxMessages.filter(m => !m.readBy || !m.readBy[currentUser.username]).length})</button>
          <button onClick={() => { setActiveTab('sent'); setSelectedMessage(null);}} className={activeTab === 'sent' ? 'active' : ''}><span className="icon">outbox</span> Sent ({sentMessages.length})</button>
          <button onClick={() => { setActiveTab('compose'); setSelectedMessage(null);}} className={activeTab === 'compose' ? 'active' : ''}><span className="icon">edit</span> Compose</button>
        </nav>

        <div className="modal-body messages-body">
            <p className="disclaimer-note full-width-disclaimer"><strong>Note:</strong> This internal messaging system is a client-side simulation using browser storage. Messages are not encrypted and will be lost if browser data is cleared. Not suitable for sensitive information.</p>
            {activeTab === 'inbox' && (
                <>
                    {renderMessageList(inboxMessages, 'inbox')}
                    {inboxMessages.some(m => m.readBy && m.readBy[currentUser.username]) && (
                         <button onClick={handleDeleteReadInboxMessages} className="action-button delete-read-button">
                            <span className="icon">delete_sweep</span> Delete Read Inbox Messages
                        </button>
                    )}
                </>
            )}
            {activeTab === 'sent' && renderMessageList(sentMessages, 'sent')}
            {activeTab === 'compose' && (
            <div className="compose-form">
                <h4>Compose New Message</h4>
                <div className="form-group">
                <label>To:</label>
                <div className="recipient-type-selector">
                    <label>
                    <input type="radio" name="recipientType" value="role" checked={composeRecipientType === 'role'} onChange={() => setComposeRecipientType('role')} />
                    Role
                    </label>
                    <label>
                    <input type="radio" name="recipientType" value="user" checked={composeRecipientType === 'user'} onChange={() => setComposeRecipientType('user')} />
                    Specific User
                    </label>
                </div>
                </div>

                {composeRecipientType === 'role' ? (
                <div className="form-group">
                    <label htmlFor="composeRecipientRole">Select Role:</label>
                    <select id="composeRecipientRole" value={composeRecipientRole} onChange={(e) => setComposeRecipientRole(e.target.value as UserRole)}>
                    {ALL_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                </div>
                ) : (
                <div className="form-group">
                    <label htmlFor="composeRecipientUser">Username:</label>
                    <input type="text" id="composeRecipientUser" value={composeRecipientUser} onChange={(e) => setComposeRecipientUser(e.target.value)} placeholder="Enter recipient's username" />
                </div>
                )}

                <div className="form-group">
                <label htmlFor="composeSubject">Subject:</label>
                <input type="text" id="composeSubject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
                </div>
                <div className="form-group">
                <label htmlFor="composeBody">Message:</label>
                <textarea id="composeBody" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={6}></textarea>
                </div>
                {composeError && <p className="error-message">{composeError}</p>}
                <button onClick={handleSendMessage} disabled={isSending} className="action-button">
                <span className="icon">send</span> {isSending ? 'Sending...' : 'Send Message'}
                </button>
            </div>
            )}

            {selectedMessage && (activeTab === 'inbox' || activeTab === 'sent') && (
                <div className="message-detail-view">
                    <h4>{selectedMessage.subject}</h4>
                    <p><strong>{activeTab === 'inbox' ? `From: ${selectedMessage.senderUsername} (${selectedMessage.senderRole})` : `To: ${selectedMessage.recipientIdentifier.type === 'role' ? `Role: ${selectedMessage.recipientIdentifier.value}`: `User: ${selectedMessage.recipientIdentifier.value}`}`}</strong></p>
                    <p><em>{new Date(selectedMessage.timestamp).toLocaleString()}</em></p>
                    <div className="message-body-content">
                        <pre>{selectedMessage.body}</pre>
                    </div>
                    <button onClick={() => setSelectedMessage(null)} className="action-button close-detail-button">Close Detail</button>
                </div>
            )}
        </div>

        <footer className="modal-footer">
          <button onClick={onClose} className="action-button">Close Messages</button>
        </footer>
      </div>
    </div>
  );
};

export default InternalMessagesModal;