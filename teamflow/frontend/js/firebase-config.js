/**
 * FlowVibe Firebase Configuration & Initialization
 * Uses Firebase v10 Modular SDK via official CDN ESM
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Dynamically load Firebase client configuration from backend environment (.env)
async function loadFirebaseConfig() {
  try {
    const res = await fetch('/api/auth/firebase/config/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.apiKey) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Could not load dynamic Firebase config from backend:', err);
  }
  return null;
}

const remoteConfig = await loadFirebaseConfig();

// Active configuration with offline fallback
const fallbackConfig = {
  apiKey: "",
  authDomain: "flowvibe-cae1c.firebaseapp.com",
  projectId: "flowvibe-cae1c",
  storageBucket: "flowvibe-cae1c.firebasestorage.app",
  messagingSenderId: "547401285011",
  appId: "1:547401285011:web:22470fe5b6ff0ce36e3c66",
  measurementId: "G-4GX29RD37M"
};

export const firebaseConfig = remoteConfig || fallbackConfig;

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firebase Analytics safely
export let analytics = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {});

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
};
