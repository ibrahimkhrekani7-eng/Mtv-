import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyArdH0VPmC6NRcFgsdDaaWesaaRll8DVn4",
  authDomain: "kurd-tv-3f648.firebaseapp.com",
  projectId: "kurd-tv-3f648",
  storageBucket: "kurd-tv-3f648.firebasestorage.app",
  messagingSenderId: "499776878997",
  appId: "1:499776878997:web:f379f098e526b28ba0de9c",
  measurementId: "G-ER2Z08X3F7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);