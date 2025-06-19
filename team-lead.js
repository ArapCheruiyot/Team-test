// team‑lead.js
document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team‑lead.js initialized");

  const db   = window.db;
  const auth = window.auth;

  let currentUser   = null;
  let currentNoteId = null;
  let saveTimeout   = null;

  // Cache DOM elements
  const newBtn      = document.getElementById('new-file');
  const delBtn      = document.getElementById('delete');
  const searchBtn   = document.getElementById('search');
  const searchInput = document.getElementById('search-input');
  const fileNames   = document.getElementById('file-names');
  const textArea    = document.getElementById('text-input');

  console.log({ newBtn, delBtn, searchBtn, searchInput, fileNames, textArea });

  // 1) Auth guard and initial load
  auth.onAuthStateChanged(user => {
    if (!user) {
      console.log("No user, redirecting…");
      return window.location.href = 'index.html';
    }
    currentUser = user;
    console.log("Signed in as", user.uid);
    loadNotes();
  });

  // 2) Load notes
  async function loadNotes() {
    console.log("Loading notes…");
    fileNames.innerHTML = '';
    try {
      const snapshot = await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('notes')
        .orderBy('updatedAt', 'desc')
        .get();

      console.log("Snapshot size:", snapshot.size);
      snapshot.forEach(doc => {
        const note  = doc.data();
        const title = note.title && note.title.trim() !== '' ? note.title : '(Untitled)';
        const item  = document.createElement('div');
        item.textContent = title;
        item.className   = 'note-item';
        item.onclick     = () => openNote(doc.id, note);
        fileNames.appendChild(item);
      });
      console.log("Rendered", fileNames.children.length, "notes");
    } catch (e) {
      console.error("Error loading notes:", e);
    }
  }

  // 3) Open a note
  function openNote(id, note) {
    console.log("Opening note", id, note);
    currentNoteId           = id;
    textArea.dataset.noteId = id;
    textArea.value          = note.content || '';
    textArea.focus();
  }

  // 4) Create a new blank note
  newBtn.addEventListener('click', async () => {
    console.log("New button clicked");
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

      console.log("Created doc:", docRef.id);
      currentNoteId = docRef.id;
      textArea.dataset.noteId = currentNoteId;
      textArea.value = '';
      textArea.focus();

      // ⛔️ Removed premature loadNotes(); it will refresh after autoSave instead

    } catch (e) {
      console.error("Error creating note:", e);
    }
  });

  // 5) Delete a note
  delBtn.addEventListener('click', async () => {
    console.log("Delete button clicked");
    const noteId = textArea.dataset.noteId;
    if (!noteId) return console.warn("No note selected to delete.");

    try {
      await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('notes')
        .doc(noteId)
        .delete();

      console.log("Deleted doc:", noteId);
      textArea.value = '';
      delete textArea.dataset.noteId;
      currentNoteId = null;
      loadNotes();
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  });

  // 6) Search toggle
  searchBtn.addEventListener('click', () => {
    searchInput.style.display = 'block';
    searchInput.focus();
  });

  // 7) Search filter
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    document.querySelectorAll('.note-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // 8) Auto-save on typing
  textArea.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(autoSaveNote, 500);
  });

  // 9) Auto-save logic
  async function autoSaveNote() {
    const noteId  = textArea.dataset.noteId;
    const content = textArea.value.trim();
    const title   = content.split('\n')[0]?.trim() || '(Untitled)';

    if (!noteId) {
      console.warn("No noteId to save");
      return;
    }

    console.log("Auto‑saving note", noteId, { title, content });

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

      console.log("✅ Auto‑saved successfully");
      loadNotes(); // Now reload after successful save

    } catch (e) {
      console.error("❌ Error auto‑saving note:", e);
    }
  }
});

// self edititng and testing
  // 👤 Add Contact toggle
  const addContactBtn = document.getElementById('add-contact-btn');
  const startChatBtn = document.getElementById('start-chat-btn');
  const addContactForm = document.getElementById('add-contact-form');
  const startChatForm = document.getElementById('start-chat-form');

  addContactBtn.addEventListener('click', () => {
    addContactForm.style.display = 'block';
    startChatForm.style.display = 'none'; // Hide the other form
  });

  // 💾 Save contact
  document.getElementById('save-contact').addEventListener('click', () => {
    const email = document.getElementById('contact-email').value.trim();
    if (email) {
      const li = document.createElement('li');
      li.textContent = `👤 ${email}`;
      document.getElementById('contact-list').appendChild(li);
      document.getElementById('contact-email').value = '';
    }
  });

  // 💬 Start Chat toggle
  startChatBtn.addEventListener('click', () => {
    startChatForm.style.display = 'block';
    addContactForm.style.display = 'none'; // Hide the other form
  });

  // 💬 Create chat
  document.getElementById('create-chat').addEventListener('click', () => {
    const chatName = document.getElementById('chat-name').value.trim();
    if (chatName) {
      const li = document.createElement('li');
      li.textContent = `💬 ${chatName}`;
      document.getElementById('chat-list').appendChild(li);
      document.getElementById('chat-name').value = '';
    }
  });

//i dont know what happening here
// === Add Contact to Firestore ===
const addContactBtn = document.getElementById('add-contact-btn');
const saveContactBtn = document.getElementById('save-contact');
const contactInput = document.getElementById('contact-email');
const contactList = document.getElementById('contact-list');

addContactBtn.addEventListener('click', () => {
  contactInput.style.display = 'inline-block';
  saveContactBtn.style.display = 'inline-block';
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
    li.textContent = email;
    contactList.appendChild(li);

    contactInput.value = '';
  } catch (e) {
    console.error("❌ Error saving contact:", e);
  }
});

// chat logis
const startChatBtn = document.getElementById('start-chat-btn');
const createChatBtn = document.getElementById('create-chat');
const chatNameInput = document.getElementById('chat-name');
const chatList = document.getElementById('chat-list');

startChatBtn.addEventListener('click', () => {
  chatNameInput.style.display = 'inline-block';
  createChatBtn.style.display = 'inline-block';
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
    li.textContent = chatName;
    chatList.appendChild(li);

    chatNameInput.value = '';
  } catch (e) {
    console.error("❌ Error creating chat:", e);
  }
});

