import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/quiz';
import { auth } from '../firebase/service';
import { signInAnonymously, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isStudent: boolean;
  loginAsStudent: (name: string, email?: string) => Promise<boolean>;
  loginAsAdmin: (passcode: string, email?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LS_AUTH_USER = 'qp_auth_user_v1';
export const ADMIN_PASSCODE = 'ETHICS2026';
export const ADMIN_EMAIL = 'vidyasharma121@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(LS_AUTH_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Attempt Firebase anonymous session so Firestore requests have auth context
    signInAnonymously(auth).catch(() => {
      // Ignored if offline or not enabled in console
    });
  }, []);

  const loginAsStudent = async (name: string, email?: string): Promise<boolean> => {
    const studentUser: UserProfile = {
      uid: 'stu-' + Math.random().toString(36).substring(2, 9),
      email: email?.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@student.edu`,
      displayName: name.trim(),
      role: 'student',
      createdAt: new Date().toISOString(),
    };
    setUser(studentUser);
    localStorage.setItem(LS_AUTH_USER, JSON.stringify(studentUser));
    return true;
  };

  const loginAsAdmin = async (passcode: string, email?: string): Promise<boolean> => {
    if (passcode.trim() !== ADMIN_PASSCODE) {
      return false;
    }
    const adminUser: UserProfile = {
      uid: 'admin-' + Math.random().toString(36).substring(2, 9),
      email: email?.trim() || ADMIN_EMAIL,
      displayName: 'Administrator',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    setUser(adminUser);
    localStorage.setItem(LS_AUTH_USER, JSON.stringify(adminUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_AUTH_USER);
    fbSignOut(auth).catch(() => {});
  };

  const switchRole = (newRole: UserRole) => {
    if (newRole === 'admin') {
      // requires passcode check in UI
      return;
    }
    if (user) {
      const updated: UserProfile = { ...user, role: newRole };
      setUser(updated);
      localStorage.setItem(LS_AUTH_USER, JSON.stringify(updated));
    }
  };

  const role = user?.role || null;
  const isAdmin = role === 'admin';
  const isStudent = role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isStudent,
        loginAsStudent,
        loginAsAdmin,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
