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
