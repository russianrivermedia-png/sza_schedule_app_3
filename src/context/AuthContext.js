import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { accountHelpers } from '../lib/supabaseHelpers';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionData = localStorage.getItem('sza_session');
        if (sessionData) {
          const { user: sessionUser, expiresAt } = JSON.parse(sessionData);
          
          // Check if session is still valid (2 weeks)
          if (new Date() < new Date(expiresAt)) {
            setUser(sessionUser);
          } else {
            // Session expired, clear it
            localStorage.removeItem('sza_session');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem('sza_session');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      
      // Query the users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password) // In production, you'd hash this
        .single();

      if (error) {
        throw new Error('Invalid credentials');
      }

      if (data) {
        const sessionData = {
          user: {
            id: data.id,
            username: data.username,
            role: data.role,
            name: data.name
          },
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks
        };

        // Store session in localStorage
        localStorage.setItem('sza_session', JSON.stringify(sessionData));
        setUser(sessionData.user);
        return { success: true };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sza_session');
    setUser(null);
  };

  const hasPermission = (requiredRole) => {
    if (!user) return false;
    
    const roleHierarchy = {
      'staff': 1,
      'supervisor': 2,
      'manager': 3
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  };

  const getStaffMember = async () => {
    if (!user) return null;
    
    try {
      const staffMember = await accountHelpers.getStaffByUserId(user.id);
      return staffMember;
    } catch (error) {
      console.error('Error getting staff member:', error);
      return null;
    }
  };

  const value = {
    user,
    login,
    logout,
    hasPermission,
    getStaffMember,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
