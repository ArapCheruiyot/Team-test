// ✅ Dashboard logic (team-lead.html)

document.addEventListener("DOMContentLoaded", () => {
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
  const auth = firebase.auth();

  auth.onAuthStateChanged(user => {
    if (!user) {
      // Not signed in? Go back to login
      window.location.href = 'index.html';
    } else {
      // Show user's name
      document.getElementById('welcome').textContent = `Welcome, ${user.displayName || "Team Lead"}!`;
    }
  });

  const signOutBtn = document.getElementById('signout');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      auth.signOut().then(() => {
        window.location.href = 'index.html';
      });
    });
  }
});
