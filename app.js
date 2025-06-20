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

function loginAsAgent() {
  const enteredEmail = prompt("Enter your email address to check if you’ve been invited:");

  if (!enteredEmail) {
    alert("Email is required to continue.");
    return;
  }

  const trimmedEmail = enteredEmail.trim().toLowerCase();
  let isInvited = false;

  db.collection("users").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();

      if (Array.isArray(data.contacts) && data.contacts.includes(trimmedEmail)) {
        isInvited = true;
      }
    });

    if (isInvited) {
      // ✅ Now allow sign-in
      auth.signInWithPopup(provider)
        .then((result) => {
          const signedInEmail = result.user.email.toLowerCase();

          if (signedInEmail === trimmedEmail) {
            window.location.href = "team-lead.html?asAgent=true";
          } else {
            alert("The signed-in email doesn't match the invited one.");
            auth.signOut();
          }
        })
        .catch(err => {
          console.error("Sign-in failed:", err);
          alert("Something went wrong during login.");
        });

    } else {
      alert("You are not invited to any workspace yet.");
    }
  }).catch(err => {
    console.error("Error checking invitation list:", err);
    alert("Could not check invitations. Please try again later.");
  });
}

