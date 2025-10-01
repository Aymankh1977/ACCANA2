/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent } from 'react';
import type { User, UserRole } from '../App'; 
import { LOCAL_STORAGE_USERS_KEY } from '../App'; // Import key
import './Login.css';

interface LoginProps {
  onLogin: (user: User) => void;
}

// Interface for users stored in localStorage (includes password for demo)
export interface StoredUser extends User {
  password?: string; // Password stored in plain text for demo - NOT SECURE
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const storedUsersRaw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    const storedUsers: StoredUser[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

    const foundUser = storedUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (foundUser) {
      // For demo, directly compare plain text password. 
      // In a real app, this would be a hash comparison.
      if (foundUser.password === password) {
        onLogin({ username: foundUser.username, role: foundUser.role });
      } else {
        setError('Invalid username or password.');
      }
    } else {
      // If user not found in stored list and it's not a default unmigrated credential
      if (username.toLowerCase() === 'admin' && password === 'adminpass') {
         onLogin({ username: 'admin', role: 'Admin' });
      } else if (username.toLowerCase() === 'lead' && password === 'leadpass') {
         onLogin({ username: 'lead', role: 'University Lead' });
      } else {
        setError('Invalid username or password.');
      }
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Dental Program Accreditation Analyzer</h1>
        <h2 className="login-subtitle">Login</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username / ID:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          {error && <p id="login-error" className="error-message login-error-message" role="alert">{error}</p>}
          <button type="submit" className="login-button">
            <span className="icon">login</span> Login
          </button>
        </form>
        <div className="login-instructions">
            <p><strong>Demo Credentials:</strong></p>
            <ul>
                <li>Admin: <code>admin</code> / <code>adminpass</code></li>
                <li>University Lead: <code>lead</code> / <code>leadpass</code></li>
                <li>Newly created users: Use username and password set during creation.</li>
                <li>University ID (if not created via User Management): Use any other non-empty username (e.g., <code>employee123</code>) / any password - this functionality will be overridden if a user with that name exists in local storage.</li>
            </ul>
            <p className="disclaimer-note"><strong>Note:</strong> User management and passwords are simulated using browser storage and are not secure for real-world use.</p>
        </div>
        <footer className="login-footer">
            <p>DentEdTech&trade; &copy; {currentYear}</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;