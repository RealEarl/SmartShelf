import { auth, provider, database } from "../AUTH/firebaseAuth.js";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendEmailVerification, 
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// IMPORT PARA SA DATABASE FUNCTIONS
import { ref, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const createBtn = document.getElementById('createBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const showPasswordCheckbox = document.getElementById("showpassword");

    // -------- HELPER: SAVE TO DATABASE --------
    async function saveUserToDB(user) {
        try {
            const userRef = ref(database, 'users/' + user.uid);

            const phTime = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

            await set(userRef, {
                email: user.email,
                uid: user.uid,
                last_login: phTime,
                status: "online"
            });
            console.log("Local time saved to DB!");
        } catch (error) {
            console.error("Database Error:", error);
        }
    }

    // -------- SHOW/HIDE PASSWORD --------
    if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener("change", () => {
            passwordInput.type = showPasswordCheckbox.checked ? "text" : "password";
        });
    }

    function validateInputs(email, password) {
        if (!email || !password) {
            alert("Please enter email and password");
            return false;
        }
        return true;
    }

    // -------- LOGIN BUTTON --------
    if (loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!validateInputs(email, password)) return;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (!user.emailVerified) {
                    alert("Please verify your email first.");
                    await signOut(auth);
                    return;
                }

                // DAGDAG: Save to Database
                await saveUserToDB(user);

               // alert("Login Successfully! ");
                
                    window.location.href = "/home.html";
                

            } catch (error) {
                alert("Login error: " + error.message);
            }
        });
    }

    // -------- CREATE BUTTON --------
    if (createBtn) {
        createBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!validateInputs(email, password)) return;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(userCredential.user);
                
                alert("Account created! Check your email for verification.");
                await signOut(auth);
                
                emailInput.value = "";
                passwordInput.value = "";
            } catch (error) {
                alert("Registration failed: " + error.message);
            }
        });
    }

    // -------- GOOGLE LOGIN BUTTON --------
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // DAGDAG: Save to Database
                await saveUserToDB(user);

                //alert("Login Successfully with Google! ");
                
                    window.location.href = "/home.html";
                
            } catch (error) {
                alert("Google error: " + error.message);
            }
        });
    }
});