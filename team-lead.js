document.addEventListener('DOMContentLoaded', () => {Add commentMore actions
  console.log("✅ team‑lead.js initialized");
window.onload = function () {
  const ownerBtn = document.getElementById('owner-signin');
  const agentBtn = document.getElementById('agent-signin');
  const defaultBtn = document.getElementById('google-signin');

  const db   = window.db;
  const auth = window.auth;

  let currentUser   = null;
  let currentNoteId = null;
  let saveTimeout   = null;
  let activeContact = null;

  // Cache DOM elements
  const newBtn         = document.getElementById('new-file');
  const delBtn         = document.getElementById('delete');
  const searchBtn      = document.getElementById('search');
  const searchInput    = document.getElementById('search-input');
  const fileNames      = document.getElementById('file-names');
  const textArea       = document.getElementById('text-input');

  const addContactBtn  = document.getElementById('add-contact-btn');
  const startChatBtn   = document.getElementById('start-chat-btn');
  const addContactForm = document.getElementById('add-contact-form');
  const startChatForm  = document.getElementById('start-chat-form');
  const contactInput   = document.getElementById('contact-email');
  const saveContactBtn = document.getElementById('save-contact');
  const contactList    = document.getElementById('contact-list');
  const chatNameInput  = document.getElementById('chat-name');
  const createChatBtn  = document.getElementById('create-chat');
  const chatList       = document.getElementById('chat-list');

  const sendBtn        = document.getElementById('send-message-btn');
  const chatInput      = document.getElementById('chat-input');
  const chatBox        = document.getElementById('chat-messages');
  const chatHeader     = document.getElementById('chat-header');

  // === Auth Handling ===
  auth.onAuthStateChanged(user => {
    if (!user) {
      return window.location.href = 'index.html';
    }

    currentUser = user;
    document.getElementById('welcome').textContent =
      `Welcome, ${user.displayName || user.email || "User"}!`;

    console.log("🧍 Logged in:", user.uid);

    loadNotes();
    loadContacts();
    loadChats();
  });

  // === Notes ===
  async function loadNotes() {
    fileNames.innerHTML = '';
    try {
      const snapshot = await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('notes')
        .orderBy('updatedAt', 'desc')
        .get();

      snapshot.forEach(doc => {
        const note = doc.data();
        const title = note.title?.trim() || '(Untitled)';
        const item = document.createElement('div');
        item.className = 'note-item';
        item.textContent = title;
        item.onclick = () => openNote(doc.id, note);
        fileNames.appendChild(item);
      });
    } catch (e) {
      console.error("Error loading notes:", e);
    }
  if (ownerBtn) {
    ownerBtn.addEventListener('click', loginAsOwner);
  }

  function openNote(id, note) {
    currentNoteId = id;
    textArea.dataset.noteId = id;
    textArea.value = note.content || '';
    textArea.focus();
  if (agentBtn) {
    agentBtn.addEventListener('click', loginAsAgent);
  }

  newBtn.addEventListener('click', async () => {
    try {
      const docRef = await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('notes')
        .add({
          title: '',
          content: '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      currentNoteId = docRef.id;
      textArea.dataset.noteId = currentNoteId;
      textArea.value = '';
      textArea.focus();
    } catch (e) {
      console.error("Error creating note:", e);
    }
  });

  delBtn.addEventListener('click', async () => {
    const noteId = textArea.dataset.noteId;
    if (!noteId) return console.warn("No note selected to delete.");

    try {
      await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('notes')
        .doc(noteId)
        .delete();

      textArea.value = '';
      delete textArea.dataset.noteId;
      currentNoteId = null;
      loadNotes();
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  });

  searchBtn.addEventListener('click', () => {
    searchInput.style.display = 'block';
    searchInput.focus();
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    document.querySelectorAll('.note-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  textArea.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(autoSaveNote, 500);
  });

  async function autoSaveNote() {
    const noteId = textArea.dataset.noteId;
    const content = textArea.value.trim();
    const title = content.split('\n')[0]?.trim() || '(Untitled)';

    if (!noteId) return console.warn("No noteId to save");

    try {
      await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('notes')
        .doc(noteId)
        .update({
          title,
          content,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      console.log("✅ Note saved");
      loadNotes();
    } catch (e) {
      console.error("❌ Auto-save error:", e);
    }
  }

  // === Contacts ===
  addContactBtn.addEventListener('click', () => {
    addContactForm.style.display = 'block';
    startChatForm.style.display = 'none';
  });

  saveContactBtn.addEventListener('click', async () => {
    const email = contactInput.value.trim();
    if (!email) return;
  if (defaultBtn) {
    defaultBtn.addEventListener('click', () => {
      defaultBtn.disabled = true;

    try {
      await db.collection('users')
        .doc(currentUser.uid)
        .collection('contacts')
        .add({
          email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
      auth.signInWithPopup(provider)
        .catch(err => console.error("Sign-in error:", err))
        .finally(() => {
          defaultBtn.disabled = false;
        });

      console.log("✅ Contact saved:", email);

      const li = document.createElement('li');
      li.textContent = `👤 ${email}`;
      contactList.appendChild(li);
      contactInput.value = '';
    } catch (e) {
      console.error("❌ Error saving contact:", e);
    }
  });

  async function loadContacts() {
    contactList.innerHTML = '';
    try {
      const snapshot = await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('contacts')
        .orderBy('createdAt', 'desc')
        .get();

      snapshot.forEach(doc => {
        const contact = doc.data();
        const li = document.createElement('li');
        li.textContent = `👤 ${contact.email}`;
        contactList.appendChild(li);
      });
    } catch (e) {
      console.error("❌ Failed to load contacts:", e);
    }
    });
  }

  // === Chats ===
  startChatBtn.addEventListener('click', () => {
    startChatForm.style.display = 'block';
    addContactForm.style.display = 'none';
  });

  createChatBtn.addEventListener('click', async () => {
    const chatName = chatNameInput.value.trim();
    if (!chatName) return;

    try {
      await db.collection('users')
        .doc(currentUser.uid)
        .collection('chats')
        .add({
          name: chatName,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      console.log("✅ Chat created:", chatName);

      const li = document.createElement('li');
      li.textContent = `💬 ${chatName}`;
      chatList.appendChild(li);
      chatNameInput.value = '';
    } catch (e) {
      console.error("❌ Error creating chat:", e);
    }
  });

  async function loadChats() {
    chatList.innerHTML = '';
    try {
      const snapshot = await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('chats')
        .orderBy('createdAt', 'desc')
        .get();

      snapshot.forEach(doc => {
        const chat = doc.data();
        const li = document.createElement('li');
        li.textContent = `💬 ${chat.name}`;
        chatList.appendChild(li);
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
    } catch (e) {
      console.error("❌ Failed to load chats:", e);
    }
  }

  // === Messaging ===
  contactList.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      document.querySelectorAll('#contact-list li').forEach(li => li.classList.remove('active'));
      e.target.classList.add('active');

      activeContact = e.target.textContent.replace('👤 ', '').trim();
      chatHeader.textContent = `Chatting with ${activeContact}`;
      chatBox.innerHTML = '';
      loadMessagesWithContact(activeContact);
    }
  });
chatList.addEventListener('click', e => {
  if (e.target.tagName === 'LI') {
    document.querySelectorAll('#chat-list li').forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');

    activeContact = e.target.textContent.replace('💬 ', '').trim();
    chatHeader.textContent = `Chatting in group: ${activeContact}`;
    chatBox.innerHTML = '';
    loadMessagesWithContact(activeContact);
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
});

  sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text || !activeContact) {
      alert("Please select a contact and type a message.");
  db.collection("users").get().then(snapshot => {
    if (snapshot.empty) {
      alert("No workspaces exist yet. Please ask your team lead to invite you.");
      return;
    }

    try {
      await db.collection('users')
        .doc(currentUser.uid)
        .collection('messages')
        .add({
          to: activeContact,
          from: currentUser.email,
          text,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    let isInvited = false;

      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = text;
      chatBox.appendChild(bubble);
      chatInput.value = '';
    } catch (e) {
      console.error("❌ Error sending message:", e);
    }
  });
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.contacts && data.contacts.includes(enteredEmail.trim().toLowerCase())) {
        isInvited = true;
      }
    });

  async function loadMessagesWithContact(contactEmail) {
    chatBox.innerHTML = '';
    try {
      const snapshot = await db.collection('users')
        .doc(currentUser.uid)
        .collection('messages')
        .where('to', '==', contactEmail)
        .orderBy('timestamp')
        .get();
        let isInvited = false;
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

      snapshot.forEach(doc => {
        const msg = doc.data();
        const div = document.createElement('div');
        div.className = 'chat-bubble';
        div.textContent = msg.text;
        chatBox.appendChild(div);
        if (isInvited) {
          window.location.href = "team-lead.html?asAgent=true";
        } else {
          alert("You are not invited to any workspace yet.");
          auth.signOut();
        }
      });

    } catch (e) {
      console.error("❌ Error loading messages:", e);
    })
    .catch((error) => {
      console.error("Agent login error:", error);
    });
    } else {
      alert("You are not invited to any workspace yet.");
    }
  }

});
  });
}
