// AUTH/authGuard.js

import { auth } from "./firebaseAuth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

export function requireAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user && user.emailVerified) {
                resolve(user); // logged in, continue loading page
            } else {
                window.location.href = "/";  // not logged in, kick to login
                reject("Not authenticated");
            }
        });
    });
}