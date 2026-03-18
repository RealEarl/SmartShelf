// firebaseAuth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBsItYp-Ol7inJrzthPhb1GQCZp2JAWv4I",
  authDomain: "gui-hosting.firebaseapp.com",
  projectId: "gui-hosting",
  storageBucket: "gui-hosting.firebasestorage.app",
  messagingSenderId: "420471242957",
  appId: "1:420471242957:web:b9331200167f7ccae32984"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };



 