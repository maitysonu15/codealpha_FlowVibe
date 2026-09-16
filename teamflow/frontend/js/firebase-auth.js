/**
 * FlowVibe Firebase Authentication Service
 * Seamlessly integrates Firebase Auth (Email/Password & Google OAuth) with FlowVibe Workspace
 */

import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from './firebase-config.js';
import { api, showToast } from './api.js';

export const firebaseAuthService = {
  /**
   * Get the current Firebase user
   */
  getCurrentUser() {
    return auth.currentUser;
  },

  /**
   * Listen for Firebase Auth state changes
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Sign In with Firebase Email & Password
   */
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      // Synchronize with backend session
      const backendUser = await this.syncWithBackend(fbUser);
      showToast(`Welcome back, ${backendUser.first_name || backendUser.username}!`, 'success');
      return backendUser;
    } catch (err) {
      const friendlyMessage = this.getFriendlyErrorMessage(err);
      showToast(friendlyMessage, 'error');
      throw new Error(friendlyMessage);
    }
  },

  /**
   * Register with Firebase Email & Password
   */
  async signUpWithEmail(data) {
    const { email, password, username, first_name, last_name } = data;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      const fullName = [first_name, last_name].filter(Boolean).join(' ') || username;
      if (fullName) {
        await updateProfile(fbUser, { displayName: fullName });
      }

      // Synchronize with backend session
      const backendUser = await this.syncWithBackend(fbUser, {
        username,
        first_name,
        last_name
      });

      showToast('Firebase account created successfully!', 'success');
      return backendUser;
    } catch (err) {
      const friendlyMessage = this.getFriendlyErrorMessage(err);
      showToast(friendlyMessage, 'error');
      throw new Error(friendlyMessage);
    }
  },

  /**
   * 1-Click Sign In / Sign Up with Google Popup via Firebase
   */
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // Synchronize with backend session
      const backendUser = await this.syncWithBackend(fbUser);
      showToast(`Signed in as ${backendUser.first_name || backendUser.username} via Google!`, 'success');
      return backendUser;
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Google sign-in popup was closed.', 'info');
        return null;
      }
      const friendlyMessage = this.getFriendlyErrorMessage(err);
      showToast(friendlyMessage, 'error');
      throw new Error(friendlyMessage);
    }
  },

  /**
   * Synchronize Firebase User with FlowVibe Django Backend Session
   */
  async syncWithBackend(fbUser, extraData = {}) {
    try {
      const payload = {
        email: fbUser.email,
        uid: fbUser.uid,
        display_name: fbUser.displayName || extraData.display_name || '',
        first_name: extraData.first_name || (fbUser.displayName ? fbUser.displayName.split(' ')[0] : ''),
        last_name: extraData.last_name || (fbUser.displayName && fbUser.displayName.includes(' ') ? fbUser.displayName.split(' ').slice(1).join(' ') : ''),
        photo_url: fbUser.photoURL || ''
      };

      const user = await api.post('/auth/firebase/', payload);
      return user;
    } catch (backendErr) {
      console.error('Backend Firebase sync error:', backendErr);
      // If backend fails, return minimum profile from Firebase user
      return {
        id: fbUser.uid,
        email: fbUser.email,
        username: fbUser.email ? fbUser.email.split('@')[0] : 'firebase_user',
        first_name: fbUser.displayName || '',
        last_name: '',
        initials: (fbUser.displayName || fbUser.email || 'U').substring(0, 2).toUpperCase(),
        avatar_color: '#6366F1'
      };
    }
  },

  /**
   * Sign Out of Firebase and FlowVibe
   */
  async signOut() {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
  },

  /**
   * Convert Firebase Error Codes to Friendly SaaS Messages
   */
  getFriendlyErrorMessage(err) {
    if (!err) return 'Authentication error occurred.';
    const code = err.code || '';

    switch (code) {
      case 'auth/unauthorized-domain':
        return 'Domain unauthorized in Firebase. Please access FlowVibe via http://localhost:8000/ or add 127.0.0.1 to your Firebase Console (Authentication > Settings > Authorized domains).';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This Firebase account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials or create an account.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by the browser. Please allow popups for this site.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was cancelled.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return err.message || 'Firebase authentication failed. Please check credentials.';
    }
  }
};
