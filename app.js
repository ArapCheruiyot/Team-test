// 1️⃣ Firebase configuration (from your console)

// 2️⃣ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 3️⃣ Wire up the “Sign in with Google” button safely
const signInBtn = document.getElementById('google-signin');
signInBtn.addEventListener('click', () => {
  // Prevent multiple popups
  signInBtn.disabled = true;

  auth.signInWithPopup(provider)
    .catch(err => console.error("Sign‑in error:", err))
    .finally(() => {
      // Re-enable button whether success or error
      signInBtn.disabled = false;
    });
});

// 4️⃣ Listen for auth state changes
auth.onAuthStateChanged(user => {
  if (user) {
    // ✅ User is signed in — send to dashboard
    window.location.href = 'team-lead.html';
  }
  // else: stay on landing page
});
