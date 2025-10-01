/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import type { User, UserRole } from '../App';
import { StoredUser } from './Login'; // For StoredUser type
import { LOCAL_STORAGE_USERS_KEY } from '../App';
import { InternalMessage, LOCAL_STORAGE_INTERNAL_MESSAGES_KEY } from './AccreditationAnalyzer';
import './UserManagementModal.css';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: UserRole;
  currentUser: User;
}

const generateWelcomeMessageBody = (newUser: StoredUser): string => {
  let roleSpecificInstructions = '';

  if (newUser.role === 'University ID') {
    roleSpecificInstructions = `
**As a University ID, here's how you can get started:**
1.  **Provide Your Content:** On the main "Accreditation Analyzer" page, paste your program/course content or upload a .txt, .pdf, or .docx file.
    *   *Example:* Paste the syllabus for your "Pediatric Dentistry" course.
2.  **Select Accreditation Bodies:** Choose the relevant accreditation bodies (e.g., ADA CODA, GDC) for your analysis.
3.  **Analyze Content:** Click "Analyze Content". Our AI will assess your material against the selected standards.
4.  **Review Results:** You'll receive a detailed report with match percentages and specific feedback for improvement for each standard.
    *   *Example:* If the "Ethical Reasoning" standard has a low match, feedback might suggest adding specific case studies or learning objectives related to dental ethics.
5.  **Training Chatbot:** For standards needing more focus, use the "Open Training Chatbot" for AI-guided assistance to refine your content.
6.  **Submit for Review:** Once ready, click "Submit for Review" to send your analysis to a University Lead or Admin.
    *   *Important:* You can typically have one submission pending review at a time. Check "Notifications" (bell icon) for status updates.
7.  **Revise Past Submissions:** Load past submissions from the "Your Past Submissions" section to revise or update them.
`;
  } else if (newUser.role === 'University Lead') {
    roleSpecificInstructions = `
**As a University Lead, your responsibilities include:**
*   All capabilities of a University ID (see above for content analysis and submission).
1.  **Review Submissions:** Access and review analyses submitted by University IDs in the "Review Submissions" section (available on the main page if there are pending submissions).
2.  **Action Submissions:** Open a submission to review details, add notes, and then 'Approve' or 'Return for Revision' (Reject) submissions. Submitters are notified automatically.
3.  **User Management:** You can add and manage 'University ID' users via the "User Management" button (cog icon in user actions panel).
`;
  } else if (newUser.role === 'Admin') {
    roleSpecificInstructions = `
**As an Admin, you have full access, including:**
*   All capabilities of a University Lead (content analysis, submission review, user management for Leads and IDs).
1.  **Full User Management:** Create and manage all user types (Admin, University Lead, University ID).
2.  **Integrations & Settings:** Access advanced application settings and potential integrations via the "Settings" button (cog icon in user actions panel).
`;
  }

  return `Hello ${newUser.username},

Welcome to the DentEdTech™ Accreditation Analyzer! We're excited to have you on board.

**What is DentEdTech™ Accreditation Analyzer?**
This application is designed to help you streamline the process of aligning your dental program's content with key accreditation standards from bodies like the ADA CODA, GDC, and NCAAA. Our AI-powered tools provide insightful analysis, feedback for improvement, and targeted training resources.

**Getting Started - Key Features & How to Use Them:**
${roleSpecificInstructions}
**A Quick Example Scenario (for a University ID user):**
Imagine you are preparing your "Clinical Periodontics" module for NCAAA accreditation.
1.  You upload the module guide (a .docx file).
2.  You select "NCAAA - ETEC" as the accreditation body.
3.  You click "Analyze Content".
4.  The results show a 65% match for "NCAAA-S4: Learning and Teaching," with feedback suggesting you better articulate your student assessment methods.
5.  You use the Training Chatbot for NCAAA-S4 to get ideas on how to describe formative and summative assessments clearly.
6.  After updating your content based on the AI's suggestions, you re-analyze and then submit it for review.

We encourage you to explore all the features! If you have any technical questions or run into issues, please use the "Support" (life-ring icon) option in the user actions panel at the bottom of the page.

Happy analyzing!

Best regards,
The DentEdTech™ System`;
};


const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, currentUserRole, currentUser }) => {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('University ID');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    const storedUsersRaw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    const storedUsers: StoredUser[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
    setUsers(storedUsers);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setNewUsername('');
      setNewPassword('');
      setNewUserRole('University ID');
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, fetchUsers]);

  const handleAddUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!newUsername.trim() || !newPassword.trim()) {
      setError("Username and password cannot be empty.");
      return;
    }

    const trimmedUsername = newUsername.trim();
    if (users.find(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
      setError("Username already exists. Please choose a different username.");
      return;
    }
    
    if (currentUserRole === 'University Lead' && newUserRole === 'Admin') {
        setError("University Leads cannot create Admin users.");
        return;
    }
    if (currentUserRole === 'University Lead' && newUserRole === 'University Lead') {
        setError("University Leads cannot create other University Lead users.");
        return;
    }

    const newUser: StoredUser = {
      username: trimmedUsername,
      role: newUserRole,
      password: newPassword, 
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
    // Send welcome message
    const welcomeMessageBody = generateWelcomeMessageBody(newUser);
    const welcomeInternalMessage: InternalMessage = {
        id: crypto.randomUUID(),
        senderUsername: "DentEdTech System", // System sender
        senderRole: "Admin", // System sender role (acts as Admin for system messages)
        recipientIdentifier: { type: 'user', value: newUser.username },
        subject: "Welcome to DentEdTech™ Accreditation Analyzer!",
        body: welcomeMessageBody,
        timestamp: new Date().toISOString(),
        readBy: {}, // Initially unread
    };

    try {
        const storedInternalMessagesRaw = localStorage.getItem(LOCAL_STORAGE_INTERNAL_MESSAGES_KEY);
        let allInternalMessages: InternalMessage[] = storedInternalMessagesRaw ? JSON.parse(storedInternalMessagesRaw) : [];
        allInternalMessages.push(welcomeInternalMessage);
        localStorage.setItem(LOCAL_STORAGE_INTERNAL_MESSAGES_KEY, JSON.stringify(allInternalMessages));
        setSuccessMessage(`User "${newUser.username}" (${newUser.role}) added successfully! A welcome message has been sent to their internal inbox.`);
    } catch (e) {
        console.error("Failed to send welcome message:", e);
        setSuccessMessage(`User "${newUser.username}" (${newUser.role}) added successfully, but the automated welcome message could not be sent.`);
    }

    setNewUsername('');
    setNewPassword('');
    // setNewUserRole('University ID'); // Keep current selection or reset as preferred
  };

  if (!isOpen) return null;

  const canAddLead = currentUserRole === 'Admin';
  // University Lead can add University ID. Admin can add University ID.
  const canAddEmployee = currentUserRole === 'Admin' || currentUserRole === 'University Lead';

  return (
    <div className="modal-overlay user-management-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="user-management-title">
      <div className="modal-content user-management-modal-content">
        <header className="modal-header">
          <h3 id="user-management-title">User Management</h3>
          <button onClick={onClose} className="close-modal-button" aria-label="Close user management">
            <span className="icon">close</span>
          </button>
        </header>
        <div className="modal-body">
          <p className="disclaimer-note full-width-disclaimer">
            <strong>Important:</strong> User management and passwords are simulated using browser storage (localStorage) for demonstration purposes only. 
            Passwords are stored in plain text and this system is NOT secure for real-world use. 
            Data will be lost if browser data is cleared.
          </p>

          <section className="add-user-section">
            <h4>Add New User</h4>
            <form onSubmit={handleAddUser} className="add-user-form">
              <div className="form-group">
                <label htmlFor="newUsername">Username:</label>
                <input
                  type="text"
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">Password:</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newUserRole">Role:</label>
                <select
                  id="newUserRole"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  required
                >
                  {currentUserRole === 'Admin' && <option value="Admin">Admin</option>}
                  {canAddLead && <option value="University Lead">University Lead</option>}
                  {canAddEmployee && <option value="University ID">University ID (Employee)</option>}
                </select>
                 {!canAddEmployee && <p className="error-message">You do not have permission to add this role.</p>}
              </div>
              {error && <p className="error-message form-error">{error}</p>}
              {successMessage && <p className="success-message form-success">{successMessage}</p>}
              <button 
                type="submit" 
                className="action-button add-user-button"
                disabled={
                    (newUserRole === 'Admin' && currentUserRole !== 'Admin') ||
                    (newUserRole === 'University Lead' && currentUserRole !== 'Admin') ||
                    (newUserRole === 'University ID' && !canAddEmployee)
                }
              >
                <span className="icon">person_add</span> Add User
              </button>
            </form>
          </section>

          <section className="view-users-section">
            <h4>Existing Users</h4>
            {users.length === 0 ? (
              <p>No users found (besides defaults if just started).</p>
            ) : (
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Role</th>
                      {/* Add actions column if needed later, e.g., reset password, deactivate */}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.username}>
                        <td>{user.username}</td>
                        <td>{user.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        <footer className="modal-footer">
          <button onClick={onClose} className="action-button">Close</button>
        </footer>
      </div>
    </div>
  );
};

export default UserManagementModal;