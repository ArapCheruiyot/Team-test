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
  const enteredEmail = prompt("Enter your email address to create your workspace");

  if (!enteredEmail) {
    alert("Email is required to proceed.");
    return;
  }

  // 🔁 Sign out any previously logged-in user
  auth.signOut().then(() => {
    auth.signInWithPopup(provider)
      .then((result) => {
        const signedInEmail = result.user.email.toLowerCase();

        if (signedInEmail !== enteredEmail.trim().toLowerCase()) {
          alert("Signed-in email does not match the one you entered.");
          auth.signOut();
          return;
        }

        const userRef = db.collection("users").doc(result.user.uid);

        return userRef.get().then((doc) => {
          if (!doc.exists) {
            return userRef.set({
              email: signedInEmail,
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
  });
}


function loginAsAgent() {
  const enteredEmail = prompt("Enter your email address to verify your invitation");

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
      // 🔁 FORCE fresh login by signing out first
      auth.signOut().then(() => {
        auth.signInWithPopup(provider)
          .then((result) => {
            const signedInEmail = result.user.email.toLowerCase();

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
      });
    } else {
      alert("You are not invited to any workspace yet.");
    }
  });
}
