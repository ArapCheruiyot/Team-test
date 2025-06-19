document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team‑lead.js initialized");

  const db   = window.db;
  const auth = window.auth;

  let currentUser   = null;
  let currentNoteId = null;
  let saveTimeout   = null;

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
  }

  function openNote(id, note) {
    currentNoteId = id;
    textArea.dataset.noteId = id;
    textArea.value = note.content || '';
    textArea.focus();
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

    try {
      await db.collection('users')
        .doc(currentUser.uid)
        .collection('contacts')
        .add({
          email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
      });
    } catch (e) {
      console.error("❌ Failed to load chats:", e);
    }
  }
});
