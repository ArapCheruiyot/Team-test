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

  const targetEmail = enteredEmail.trim().toLowerCase();
  console.log("Entered email:", targetEmail);

  db.collection("users").get().then(snapshot => {
    if (snapshot.empty) {
      alert("No workspaces exist yet.");
      return;
    }

    let isInvited = false;

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log("Checking team lead:", data.email);
      console.log("Their contacts:", data.contacts);

      if (Array.isArray(data.contacts) && data.contacts.includes(targetEmail)) {
        isInvited = true;
      }
    });

    if (isInvited) {
      auth.signOut().then(() => {
        auth.signInWithPopup(provider)
          .then((result) => {
            const signedInEmail = result.user.email.toLowerCase();
            console.log("Signed-in email:", signedInEmail);

            if (signedInEmail === targetEmail) {
              window.location.href = "team-lead.html?asAgent=true";
            } else {
              alert("Signed-in email doesn't match the one you entered.");
              auth.signOut();
            }
          });
      });
    } else {
      alert("You are not invited to any workspace yet.");
    }
  });
}
