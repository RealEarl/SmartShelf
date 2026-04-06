// firebaseAuth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBsItYp-Ol7inJrzthPhb1GQCZp2JAWv4I",
  authDomain: "gui-hosting.firebaseapp.com",
  databaseURL: "https://gui-hosting-default-rtdb.firebaseio.com/",
  projectId: "gui-hosting",
  storageBucket: "gui-hosting.firebasestorage.app",
  messagingSenderId: "420471242957",
  appId: "1:420471242957:web:b9331200167f7ccae32984"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
  

const provider = new GoogleAuthProvider();
// ITO ANG PINAKA-IMPORTANTE: Pinipilit nito si Google na magtanong kung anong account ang gagamitin
provider.setCustomParameters({
  prompt: 'select_account', hd: "*"
});


export { auth , database , provider};





 