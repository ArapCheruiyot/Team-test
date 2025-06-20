window.onload = function () {
  const ownerBtn = document.getElementById('owner-signin');
  const agentBtn = document.getElementById('agent-signin');
  const defaultBtn = document.getElementById('google-signin');

  if (ownerBtn) {
    ownerBtn.addEventListener('click', loginAsOwner);
  }

  if (agentBtn) {
    agentBtn.addEventListener('click', loginAsAgent);
  }

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

// 🔁 TEMPORARILY DISABLED - Let agent/owner login handle routing
// auth.onAuthStateChanged(user => {
//   if (user) {
//     window.location.href = 'team-lead.html';
//   }
// });

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
        window.location.href = "team-lead.html";
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
        if (snapshot.empty) {
          alert("No workspaces exist yet. Please ask your team lead to invite you.");
          auth.signOut();
          return;
        }

        let isInvited = false;

        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.contacts && data.contacts.includes(agentEmail)) {
            isInvited = true;
          }
        });

        if (isInvited) {
          window.location.href = "dashboard.html?asAgent=true";
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
