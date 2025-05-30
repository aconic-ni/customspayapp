
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, type Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA2UWt9LUyRQla21ORN3y-Oyu4ab4cWWs0",
  authDomain: "customsfa-l.firebaseapp.com",
  projectId: "customsfa-l",
  storageBucket: "customsfa-l.firebasestorage.app",
  messagingSenderId: "683654250445",
  appId: "1:683654250445:web:1a5bfa3deaecc92dd60e84",
  measurementId: "G-D8R5MWBPVD"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Use existing app if already initialized
}

const authInstance: Auth = getAuth(app);
const firestoreInstance: Firestore = getFirestore(app);

let analytics: Analytics | undefined;
// Initialize Analytics only on the client side
if (typeof window !== 'undefined') {
  try {
    // Check if measurementId is provided before initializing analytics
    if (firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    } else {
      console.warn("Firebase Analytics not initialized because measurementId is missing from firebaseConfig.");
    }
  } catch (error) {
    console.warn("Firebase Analytics could not be initialized.", error);
  }
}

export { app, authInstance as auth, firestoreInstance as db, analytics };
