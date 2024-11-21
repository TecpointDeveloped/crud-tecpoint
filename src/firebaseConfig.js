// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAXddFmy9Z4BXsH0TShq1VRz4JX4L7ktwE",
  authDomain: "tecpoint-2024.firebaseapp.com",
  projectId: "tecpoint-2024",
  storageBucket: "tecpoint-2024.appspot.com",
  messagingSenderId: "187379949598",
  appId: "1:187379949598:web:5f887f25ada1eaae2f4e0f",
  measurementId: "G-43E14570X3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);