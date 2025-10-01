/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0 
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useCallback, useEffect } from 'react';
import AccreditationAnalyzer from './components/AccreditationAnalyzer';
import Login, { StoredUser } from './components/Login';
import './index.css'; // Ensure global styles are loaded

export type UserRole = 'Admin' | 'University Lead' | 'University ID';

export interface User {
  username: string;
  role: UserRole;
}

export const LOCAL_STORAGE_USERS_KEY = 'dentedtechUsers';

/**
 * Main application component.
 */
function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Seed default users if none exist (for demo purposes)
    const storedUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!storedUsers) {
      const defaultUsers: StoredUser[] = [
        { username: 'admin', role: 'Admin', password: 'adminpass' }, // Storing plain text for demo
        { username: 'lead', role: 'University Lead', password: 'leadpass' },
      ];
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(defaultUsers));
    }
    setAppReady(true); // Indicate app is ready after seeding check
  }, []);

  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    // Optionally clear other session-specific data if needed
  }, []);

  if (!appReady) {
    return <div className="loading-indicator">Initializing Application...</div>; // Or some loading spinner
  }

  return (
    <div className="App">
      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : (
        <AccreditationAnalyzer currentUser={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;