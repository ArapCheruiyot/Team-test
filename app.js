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

// ─── TEAM LEAD (OWNER) LOGIN ─────────────────────────────────────────
function loginAsOwner() {
  auth.signOut().then(() => {
    auth.signInWithPopup(provider)
      .then((result) => {
        const user = result.user;
        const userRef = db.collection("users").doc(user.uid);
        return userRef.get().then(doc => {
          if (!doc.exists) {
            return userRef.set({
              email: user.email.toLowerCase(),
              contacts: [],
              createdAt: new Date(),
              isOwner: true
            });
          }
        });
      })
      .then(() => {
        window.location.href = "team-lead.html";
      })
      .catch(err => {
        console.error("Owner login error:", err);
        alert("Something went wrong during sign-in.");
      });
  });
}

// ─── AGENT LOGIN (PASSING LEADER UID) ────────────────────────────────
async function loginAsAgent() {
  try {
    await auth.signOut();
    const result = await auth.signInWithPopup(provider);
    const agentEmail = result.user.email.toLowerCase();

    // find which leader invited this agent
    const usersSnap = await db.collection("users").get();
    let invitedByUid = null;
    for (const doc of usersSnap.docs) {
      const contactSnap = await db
        .collection("users").doc(doc.id)
        .collection("contacts")
        .where("email", "==", agentEmail)
        .get();
      if (!contactSnap.empty) {
        invitedByUid = doc.id;
        break;
      }
    }

    if (invitedByUid) {
      window.location.href =
        `team-lead.html?asAgent=true&leader=${invitedByUid}`;
    } else {
      alert("❌ You are not invited to any workspace yet.");
      auth.signOut();
    }
  } catch (err) {
    console.error("Agent login error:", err);
    alert("Login failed. Please try again.");
  }
}
