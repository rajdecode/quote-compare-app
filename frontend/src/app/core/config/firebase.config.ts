import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDrqmeXhqloKwC8fqN3dRPMx_7naaKyRXM",
    authDomain: "quotecompare-c48f1.firebaseapp.com",
    projectId: "quotecompare-c48f1",
    storageBucket: "quotecompare-c48f1.firebasestorage.app",
    messagingSenderId: "350064803261",
    appId: "1:350064803261:web:33efb57a4a3bd23e4466d4",
    measurementId: "G-KN216XJYK5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
