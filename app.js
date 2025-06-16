// ✅ Initialize Firebase only once
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyBQSl1HtlJBPRBcgt5culdCDj_cBVN40Io",
    authDomain: "offer-upload.firebaseapp.com",
    projectId: "offer-upload",
    storageBucket: "offer-upload.firebasestorage.app",
    messagingSenderId: "147934510488",
    appId: "1:147934510488:web:cdf01aed4342a43475bfed",
    measurementId: "G-ZPBL7DC3YG"
  };
  firebase.initializeApp(firebaseConfig);
}

// ✅ Export Firebase services globally
window.auth = firebase.auth();
window.provider = new firebase.auth.GoogleAuthProvider();
window.db = firebase.firestore();

// ✅ Handle sign-in button
const signInBtn = document.getElementById('google-signin');
signInBtn.addEventListener('click', () => {
  signInBtn.disabled = true;

  window.auth.signInWithPopup(window.provider)
    .catch(err => console.error("Sign‑in error:", err))
    .finally(() => {
      signInBtn.disabled = false;
    });
});

// ✅ Redirect when signed in
window.auth.onAuthStateChanged(user => {
  if (user) {
    window.location.href = 'team-lead.html';
  }
});
