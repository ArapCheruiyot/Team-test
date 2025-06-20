window.onload = function () {
  const ownerBtn = document.getElementById('owner-signin');
  const agentBtn = document.getElementById('agent-signin');

  if (ownerBtn) {
    ownerBtn.addEventListener('click', loginAsOwner);
  }

  if (agentBtn) {
    agentBtn.addEventListener('click', loginAsAgent);
  }
};

// ✅ TEAM LEAD (OWNER) LOGIN
function loginAsOwner() {
  auth.signOut().then(() => {
    auth.signInWithPopup(provider)
      .then((result) => {
        const user = result.user;
        const userRef = db.collection("users").doc(user.uid);

        return userRef.get().then((doc) => {
          if (!doc.exists) {
            return userRef.set({
              email: user.email.toLowerCase(),
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
        alert("Something went wrong during sign-in.");
      });
  });
}

// ✅ AGENT LOGIN WITHOUT PROMPT
function loginAsAgent() {
  auth.signInWithPopup(provider)
    .then((result) => {
      const signedInEmail = result.user.email.toLowerCase();
      console.log("🔍 Signed in as agent:", signedInEmail);

      // Step 1: Fetch all users (team leads)
      db.collection("users").get()
        .then(snapshot => {
          const userChecks = [];

          snapshot.forEach(userDoc => {
            const userId = userDoc.id;

            // Step 2: For each user, check their contacts subcollection
            const check = db.collection("users").doc(userId).collection("contacts")
              .where("email", "==", signedInEmail)
              .get()
              .then(contactSnapshot => {
                return !contactSnapshot.empty; // true if match found
              });

            userChecks.push(check);
          });

          // Step 3: Wait for all checks to finish
          return Promise.all(userChecks);
        })
        .then(results => {
          const isInvited = results.some(found => found);

          if (isInvited) {
            console.log("✅ Agent is invited, redirecting to dashboard...");
            window.location.href = "team-lead.html?asAgent=true";
          } else {
            alert("❌ You are not invited to any workspace yet.");
            auth.signOut();
          }
        })
        .catch(error => {
          console.error("❌ Error during agent login:", error);
          alert("Something went wrong. Please try again.");
        });
    })
    .catch((error) => {
      console.error("❌ Sign-in failed:", error);
      alert("Login failed.");
    });
}
