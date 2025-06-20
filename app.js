window.onload = function () {
  const ownerBtn = document.getElementById('owner-signin');

  if (ownerBtn) {
    ownerBtn.addEventListener('click', loginAsOwner);
  }
};

function loginAsOwner() {
  // Log out any existing user to always start fresh
  auth.signOut().then(() => {
    auth.signInWithPopup(provider)
      .then((result) => {
        const user = result.user;
        const userRef = db.collection("users").doc(user.uid);

        return userRef.get().then((doc) => {
          if (!doc.exists) {
            // First-time login — create user document
            return userRef.set({
              email: user.email,
              contacts: [],
              createdAt: new Date(),
              isOwner: true
            });
          }
        }).then(() => {
          // ✅ Go to dashboard
          window.location.href = "team-lead.html";
        });
      })
      .catch((error) => {
        console.error("Owner login error:", error);
        alert("Something went wrong during sign-in.");
      });
  });
}
