import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD_fSnm5mSi8_L-FFQjTgcI632G8fWtrCc",
  authDomain: "codeup-ef28b.firebaseapp.com",
  projectId: "codeup-ef28b",
  storageBucket: "codeup-ef28b.firebasestorage.app",
  messagingSenderId: "354469745353",
  appId: "1:354469745353:web:736c9636e88987ca4b7318",
  measurementId: "G-ZFYP19C99C"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Use Arabic language for verification SMS
if (typeof window !== "undefined") {
  auth.useDeviceLanguage();
}

export { app, auth };
