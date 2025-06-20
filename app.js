window.onload = function () {
  const ownerBtn = document.getElementById('owner-signin');
  const agentBtn = document.getElementById('agent-signin');
  const defaultBtn = document.getElementById('google-signin');

  // ✅ If "Start My Workspace" button exists
  if (ownerBtn) {
    ownerBtn.addEventListener('click', loginAsOwner);
  }

  // ✅ If "Login as Agent" button exists
  if (agentBtn) {
    agentBtn.addEventListener('click', loginAsAgent);
  }

  // ✅ If default "Google Sign-in" button exists
  if (defaultBtn) {
    defaultBtn.addEventListener('click', () => {
      defaultBtn.disabled = true;

      auth.signInWithPopup(provider)
        .catch(err => console.error("Sign-in error:", err))
        .finally(() => {
          defaultBtn.disabled = false;
        });
    });
  }
};

auth.onAuthStateChanged(user => {
  if (user) {
    // Default fallback redirect if used old button
    window.location.href = 'team-lead.html';
  }
});

function loginAsOwner() {
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      const userRef = db.collection("users").doc(user.uid);

      return userRef.get().then((doc) => {
        if (!doc.exists) {
          return userRef.set({
            email: user.email,
            contacts: [],
            createdAt: new Date(),
            isOwner: true
          });
        }
      }).then(() => {
        window.location.href = "dashboard.html"; // Full owner view
      });
    })
    .catch((error) => {
      console.error("Owner login error:", error);
    });
}

function loginAsAgent() {
  auth.signInWithPopup(provider)
    .then((result) => {
      const agentEmail = result.user.email;

      db.collection("users").get().then(snapshot => {
        let isInvited = false;

        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.contacts && data.contacts.includes(agentEmail)) {
            isInvited = true;
          }
        });

        if (isInvited) {
          window.location.href = "dashboard.html?asAgent=true"; // Restricted agent view
        } else {
          alert("You are not invited to any workspace yet.");
          auth.signOut();
        }
      });
    })
    .catch((error) => {
      console.error("Agent login error:", error);
    });
}
