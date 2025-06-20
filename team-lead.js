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
  const enteredEmail = prompt("Enter your email address to verify your invitation");

      db.collection("users").get().then(snapshot => {
        if (snapshot.empty) {
          alert("No workspaces exist yet. Please ask your team lead to invite you.");
          auth.signOut();
          return;
        }
  if (!enteredEmail) {
    alert("Email is required to proceed.");
    return;
  }

  db.collection("users").get().then(snapshot => {
    if (snapshot.empty) {
      alert("No workspaces exist yet. Please ask your team lead to invite you.");
      return;
    }

    let isInvited = false;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.contacts && data.contacts.includes(enteredEmail.trim().toLowerCase())) {
        isInvited = true;
      }
    });

        
    if (isInvited) {
      // ✅ Email is in contact list — now allow Google Sign-In
      auth.signInWithPopup(provider)
        .then((result) => {
          const signedInEmail = result.user.email.toLowerCase();

        snapshot.forEach(doc => {
          const data = doc.data();Add commentMore actions
          if (data.contacts && data.contacts.includes(agentEmail)) {
            isInvited = true;
          // Double-check match for safety
          if (signedInEmail === enteredEmail.trim().toLowerCase()) {
            window.location.href = "team-lead.html?asAgent=true";
          } else {
            alert("Signed-in email doesn't match the invited email.");
            auth.signOut();
          }
        })
        .catch((error) => {
          console.error("Agent login error:", error);
        });

        if (isInvited) {
          window.location.href = "team-lead.html?asAgent=true";
        } else {
          alert("You are not invited to any workspace yet.");
          auth.signOut();
        }
      });
    })
    .catch((error) => {
      console.error("Agent login error:", error);
    });
    } else {
      alert("You are not invited to any workspace yet.");
    }
  });
}
