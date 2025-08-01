import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import axios from 'axios';
import { toast } from 'react-toastify';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  // Configure axios defaults
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get the ID token
          const token = await user.getIdToken();
          setAuthToken(token);
          localStorage.setItem('authToken', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token with backend and get user profile
          const response = await axios.post('/api/auth/verify-token');
          setCurrentUser(user);
          setUserProfile(response.data.user);
        } catch (error) {
          console.error('Error verifying token:', error);
          toast.error('Authentication error. Please sign in again.');
          await signOut(auth);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setAuthToken(null);
        localStorage.removeItem('authToken');
        delete axios.defaults.headers.common['Authorization'];
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Refresh token periodically
  useEffect(() => {
    let tokenRefreshInterval;
    
    if (currentUser) {
      tokenRefreshInterval = setInterval(async () => {
        try {
          const token = await currentUser.getIdToken(true); // Force refresh
          setAuthToken(token);
          localStorage.setItem('authToken', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error) {
          console.error('Error refreshing token:', error);
        }
      }, 45 * 60 * 1000); // Refresh every 45 minutes
    }

    return () => {
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, [currentUser]);

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get the ID token
      const token = await user.getIdToken();
      
      // Verify with backend
      const response = await axios.post('/api/auth/verify-token', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.user.role === 'viewer') {
        toast.warning('You have limited access. Contact admin for full access.');
      }
      
      toast.success('Successfully signed in!');
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Sign in error:', error);
      let errorMessage = 'Failed to sign in';
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Account has been disabled. Contact administrator.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message || 'Failed to sign in';
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOutUser = async () => {
    try {
      await signOut(auth);
      toast.success('Successfully signed out');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
      return { success: false, error: error.message };
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent. Check your inbox.');
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send password reset email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        default:
          errorMessage = error.message || 'Failed to send password reset email';
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update user profile
  const updateUserProfile = async (profileData) => {
    try {
      if (currentUser && profileData.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: profileData.displayName
        });
      }
      
      // Update profile in backend if needed
      const response = await axios.get('/api/auth/profile');
      setUserProfile(response.data.user);
      
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
      return { success: false, error: error.message };
    }
  };

  // Check if user has required role
  const hasRole = (requiredRoles) => {
    if (!userProfile || !userProfile.role) return false;
    if (!Array.isArray(requiredRoles)) requiredRoles = [requiredRoles];
    return requiredRoles.includes(userProfile.role);
  };

  // Check if user is admin
  const isAdmin = () => {
    return userProfile?.role === 'admin';
  };

  // Check if user is engineer or higher
  const isEngineer = () => {
    return userProfile?.role === 'engineer' || userProfile?.role === 'admin';
  };

  // Get user display name
  const getDisplayName = () => {
    return userProfile?.name || currentUser?.displayName || currentUser?.email || 'User';
  };

  // Get authentication status
  const isAuthenticated = () => {
    return !!currentUser && !!userProfile;
  };

  // Context value
  const value = {
    // User state
    currentUser,
    userProfile,
    authToken,
    loading,
    
    // Authentication methods
    signIn,
    signOut: signOutUser,
    resetPassword,
    updateUserProfile,
    
    // Role checking methods
    hasRole,
    isAdmin,
    isEngineer,
    isAuthenticated,
    getDisplayName,
    
    // User info
    userRole: userProfile?.role || 'viewer',
    userName: getDisplayName(),
    userEmail: currentUser?.email || '',
    emailVerified: currentUser?.emailVerified || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};