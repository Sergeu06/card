// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0SXNWUjftNziCo-TImzA1ksA8w8n-Rfc",
  authDomain: "snake-6da20.firebaseapp.com",
  projectId: "snake-6da20",
  storageBucket: "snake-6da20.appspot.com",
  messagingSenderId: "792222318675",
  appId: "1:792222318675:web:5ecacccf554824a7ef46a6",
  measurementId: "G-P9R1G79S57"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Initialize Firestore
const auth = getAuth(app);

export { db, auth };
