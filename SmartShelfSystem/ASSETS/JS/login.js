document.addEventListener("DOMContentLoaded", () => {
    const passwordInput = document.getElementById("password");
    const showPasswordCheckbox = document.getElementById("showpassword");

    showPasswordCheckbox.addEventListener("change", () => {
        if (showPasswordCheckbox.checked) {
            passwordInput.type = "text";   // show password
        } else {
            passwordInput.type = "password"; // hide password
        }
    });
});

// login.js
import { auth } from "../AUTH/firebaseAuth.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const loginBtn = document.getElementById('loginBtn');
const createBtn = document.getElementById('createBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const showPassword = document.getElementById('showpassword');

// -------- HELPER: VALIDATE INPUTS --------
function validateInputs(email, password) {
    if (!email || !password) {
        alert("Please enter email and password");
        return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        alert("Invalid email format");
        return false;
    }
    if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return false;
    }
    return true;
}

// -------- LOGIN BUTTON --------
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!validateInputs(email, password)) return;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // SUCCESS: Redirect to the home page served by Flask
        window.location.href = "/home.html"; 
    } catch (error) {
        if (error.code === "auth/user-not-found") {
            alert("Please create an account first");
        } else if (error.code === "auth/wrong-password") {
            alert("Incorrect password");
        } else {
            alert("Login failed: " + error.message);
        }
    }
});

// -------- CREATE BUTTON --------
createBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!validateInputs(email, password)) return;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Created successfully!");
        emailInput.value = "";
        passwordInput.value = "";
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            alert("Email already used");
        } else if (error.code === "auth/weak-password") {
            alert("Password too weak");
        } else {
            alert("Error: " + error.message);
        }
    }
});






