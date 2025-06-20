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

// 👤 Owner Login
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
        alert("Login failed. Try again.");
      });
  });
}

// 👥 Agent Login
function loginAsAgent() {
  auth.signOut().then(() => {
    auth.signInWithPopup(provider)
      .then((result) => {
        const signedInEmail = result.user.email.toLowerCase();
        let isInvited = false;

        db.collection("users").get().then(snapshot => {
          snapshot.forEach(doc => {
            const data = doc.data();
            const contactList = (data.contacts || []).map(e => e.trim().toLowerCase());

            if (contactList.includes(signedInEmail)) {
              isInvited = true;
            }
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
        alert("Login failed. Try again.");
      });
  });
}
