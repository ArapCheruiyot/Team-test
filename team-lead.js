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
