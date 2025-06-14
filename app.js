// 1️⃣ Firebase configuration (from your console)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};

// 2️⃣ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 3️⃣ Wire up the “Sign in with Google” button
document.getElementById('google-signin').addEventListener('click', () => {
  auth.signInWithPopup(provider)
    .catch(err => console.error("Sign‑in error:", err));
});

// 4️⃣ Listen for auth state changes
auth.onAuthStateChanged(user => {
  if (user) {
    // ✅ User is signed in—send them to the dashboard
    window.location.href = 'team-lead.html';
  }
  // else: stay on landing page and show the button
});
