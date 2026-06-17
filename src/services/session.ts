/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from '../types';

let listeners: Array<(user: User | null) => void> = [];
let currentUser: User | null = (() => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('imperial_user_session');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  // Initialize standard dummy user for visual fidelity
  const fallbackUser: User = {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    nickname: 'ImperialMaster',
    token: 'mock_jwt_token_for_playground_ux',
    points: 88800,
  };
  localStorage.setItem('imperial_user_session', JSON.stringify(fallbackUser));
  return fallbackUser;
})();

function emitChange() {
  listeners.forEach((listener) => listener(currentUser));
}

export function useSession() {
  const [user, setUser] = useState<User | null>(currentUser);

  useEffect(() => {
    const listener = (newUser: User | null) => {
      setUser(newUser);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const loginLocal = (nickname: string) => {
    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      nickname: nickname.trim() || 'Player_' + Math.floor(Math.random() * 9000 + 1000),
      token: 'jwt_' + Math.random().toString(36).substr(2, 12),
      points: 50000, // starting chips in demo mode
    };
    currentUser = newUser;
    localStorage.setItem('imperial_user_session', JSON.stringify(newUser));
    emitChange();
    return newUser;
  };

  const logoutLocal = () => {
    currentUser = null;
    localStorage.removeItem('imperial_user_session');
    emitChange();
  };

  const updatePointsLocal = (amount: number) => {
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        points: Math.max(0, currentUser.points + amount),
      };
      currentUser = updatedUser;
      localStorage.setItem('imperial_user_session', JSON.stringify(updatedUser));
      emitChange();
    }
  };

  const setFullUser = (newUser: User) => {
    currentUser = newUser;
    localStorage.setItem('imperial_user_session', JSON.stringify(newUser));
    emitChange();
  };

  return {
    user,
    isLoggedIn: user !== null,
    login: loginLocal,
    logout: logoutLocal,
    updatePoints: updatePointsLocal,
    setFullUser,
  };
}
