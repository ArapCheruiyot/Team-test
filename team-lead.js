document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  const db   = window.db;
  const auth = window.auth;

  // ——————————————
  // 🚩 AGENT DETECTION & UI LOCKDOWN
  // ——————————————
  const isAgent = new URLSearchParams(window.location.search).get('asAgent') === 'true';
  console.log("🕵️ Agent mode:", isAgent);

  if (isAgent) {
    // Elements to hide from agents
    const toHide = [
      document.getElementById('new-file'),
      document.getElementById('delete'),
      document.getElementById('add-contact-btn'),
      document.getElementById('start-chat-btn'),
      document.getElementById('add-contact-form'),
      document.getElementById('start-chat-form')
    ];
    toHide.forEach(el => { if (el) el.style.display = 'none'; });

    // Optional: change welcome text to indicate agent mode
    const welcomeEl = document.getElementById('welcome');
    if (welcomeEl) {
      welcomeEl.textContent += " (Agent)";
    }

    console.log("🔐 Restricted features hidden from Agent");
  }

  // ——————————————
  // 🔐 AUTH HANDLING
  // ——————————————
  let currentUser = null;
  auth.onAuthStateChanged(user => {
    if (!user) {
      return window.location.href = 'index.html';
    }
    currentUser = user;
    const welcomeEl = document.getElementById('welcome');
    if (welcomeEl) {
      welcomeEl.textContent = Welcome, ${user.displayName || user.email || "User"}!;
      if (isAgent) welcomeEl.textContent += " (Agent)";
    }
    loadNotes();
    loadContacts();
    loadChats();
  });

  // ——————————————
  // 📒 NOTES
  // ——————————————
  const newBtn    = document.getElementById('new-file');
  const delBtn    = document.getElementById('delete');
  const fileNames = document.getElementById('file-names');
  const textArea  = document.getElementById('text-input');
  let currentNoteId = null;
  let saveTimeout   = null;

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
  }

  function openNote(id, note) {
    currentNoteId = id;
    textArea.dataset.noteId = id;
    textArea.value = note.content || '';
    textArea.focus();
  }

  if (newBtn) newBtn.addEventListener('click', async () => {
    if (isAgent) return; // agents cannot create notes
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
      openNote(docRef.id, { content: '' });
      loadNotes();
    } catch (e) {
      console.error("Error creating note:", e);
    }
  });

  if (delBtn) delBtn.addEventListener('click', async () => {
    if (isAgent) return; // agents cannot delete
    const noteId = textArea.dataset.noteId;
    if (!noteId) return;
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

  textArea.addEventListener('input', () => {
    if (isAgent) return; // agents cannot edit
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const noteId = textArea.dataset.noteId;
      if (!noteId) return;
      const content = textArea.value.trim();
      const title = content.split('\n')[0]?.trim() || '(Untitled)';
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
        loadNotes();
      } catch (e) {
        console.error("Auto-save error:", e);
      }
    }, 500);
  });

  // ——————————————
  // 👥 CONTACTS
  // ——————————————
  const addContactBtn  = document.getElementById('add-contact-btn');
  const saveContactBtn = document.getElementById('save-contact');
  const contactInput   = document.getElementById('contact-email');
  const contactList    = document.getElementById('contact-list');

  if (addContactBtn) addContactBtn.addEventListener('click', () => {
    if (isAgent) return;
    document.getElementById('add-contact-form').style.display = 'block';
  });

  if (saveContactBtn) saveContactBtn.addEventListener('click', async () => {
    if (isAgent) return;
    const email = contactInput.value.trim().toLowerCase();
    if (!email) return;
    try {
      await db.collection('users')
        .doc(currentUser.uid)
        .collection('contacts')
        .add({ email, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      contactInput.value = '';
      loadContacts();
    } catch (e) {
      console.error("Error saving contact:", e);
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
        const c = doc.data();
        const li = document.createElement('li');
        li.textContent = 👤 ${c.email};
        contactList.appendChild(li);
      });
    } catch (e) {
      console.error("Failed to load contacts:", e);
    }
  }

  // ——————————————
  // 💬 CHATS & MESSAGES
  // ——————————————
  const startChatBtn = document.getElementById('start-chat-btn');
  const createChatBtn = document.getElementById('create-chat');
  const chatNameInput = document.getElementById('chat-name');
  const chatList      = document.getElementById('chat-list');
  const chatInput     = document.getElementById('chat-input');
  const sendBtn       = document.getElementById('send-message-btn');
  const chatBox       = document.getElementById('chat-messages');
  const chatHeader    = document.getElementById('chat-header');

  if (startChatBtn) startChatBtn.addEventListener('click', () => {
    if (isAgent) return;
    document.getElementById('start-chat-form').style.display = 'block';
  });

  if (createChatBtn) createChatBtn.addEventListener('click', async () => {
    if (isAgent) return;
    const chatName = chatNameInput.value.trim();
    if (!chatName) return;
    try {
      await db.collection('users')
        .doc(currentUser.uid)
        .collection('chats')
        .add({ name: chatName, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      chatNameInput.value = '';
      loadChats();
    } catch (e) {
      console.error("Error creating chat:", e);
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
        li.textContent = 💬 ${chat.name};
        chatList.appendChild(li);
      });
    } catch (e) {
      console.error("Failed to load chats:", e);
    }
  }

  contactList.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      document.querySelectorAll('#contact-list li').forEach(li => li.classList.remove('active'));
      e.target.classList.add('active');
      activeContact = e.target.textContent.replace('👤 ', '').trim();
      chatHeader.textContent = Chatting with ${activeContact};
      chatBox.innerHTML = '';
      loadMessagesWithContact(activeContact);
    }
  });

  chatList.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      document.querySelectorAll('#chat-list li').forEach(li => li.classList.remove('active'));
      e.target.classList.add('active');
      activeContact = e.target.textContent.replace('💬 ', '').trim();
      chatHeader.textContent = Chatting in group: ${activeContact};
      chatBox.innerHTML = '';
      loadMessagesWithContact(activeContact);
    }
  });

  if (sendBtn) sendBtn.addEventListener('click', async () => {
    if (!activeContact) return alert("Please select a contact first.");
    const text = chatInput.value.trim();
    if (!text) return;
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
      loadMessagesWithContact(activeContact);
      chatInput.value = '';
    } catch (e) {
      console.error("Error sending message:", e);
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
      snapshot.forEach(doc => {
        const msg = doc.data();
        const div = document.createElement('div');
        div.className = 'chat-bubble';
        div.textContent = msg.text;
        chatBox.appendChild(div);
      });
    } catch (e) {
      console.error("Error loading messages:", e);
    }
  }

});
