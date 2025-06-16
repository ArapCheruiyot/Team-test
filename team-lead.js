// team‑lead.js
document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team‑lead.js initialized");

  const db = window.db;
  const auth = window.auth;

  let currentUser = null;
  let currentNoteId = null;
  let saveTimeout = null;

  // Cache DOM elements
  const newBtn      = document.getElementById('new-file');
  const delBtn      = document.getElementById('delete');
  const searchBtn   = document.getElementById('search');
  const searchInput = document.getElementById('search-input');
  const fileNames   = document.getElementById('file-names');
  const textArea    = document.getElementById('text-input');

  console.log("newBtn:", newBtn, "delBtn:", delBtn, "textArea:", textArea);

  // Auth listener
  auth.onAuthStateChanged(user => {
    if (!user) {
      console.log("No user, redirecting…");
      return;
    }
    currentUser = user;
    console.log("Signed in as", user.uid);
    loadNotes();
  });

  // Load notes
  async function loadNotes() {
    console.log("Loading notes…");
    fileNames.innerHTML = '';
    const snapshot = await db
      .collection('users')
      .doc(currentUser.uid)
      .collection('notes')
      .orderBy('createdAt', 'desc')
      .get();

    console.log("Notes snapshot size:", snapshot.size);

    snapshot.forEach(doc => {
      const note = doc.data();
      const item = document.createElement('div');
      item.textContent = note.title || '(Untitled)';
      item.className = 'note-item';
      item.onclick = () => openNote(doc.id, note);
      fileNames.appendChild(item);
    });
    console.log("Rendered", fileNames.children.length, "notes");
  }

  // Open a note
  function openNote(id, note) {
    console.log("Opening note", id, note);
    currentNoteId = id;
    textArea.dataset.noteId = id;
    textArea.value = note.content;
  }

  // Create a new note
  newBtn.addEventListener('click', async () => {
    console.log("New button clicked");
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

    console.log("Created doc", docRef.id);
    currentNoteId = docRef.id;
    textArea.dataset.noteId = currentNoteId;
    textArea.value = '';
    textArea.focus();
    loadNotes();
  });

  // Delete current note
  delBtn.addEventListener('click', async () => {
    console.log("Delete button clicked");
    const noteId = textArea.dataset.noteId;
    if (!noteId) return console.warn('No note selected to delete.');

    await db
      .collection('users')
      .doc(currentUser.uid)
      .collection('notes')
      .doc(noteId)
      .delete();

    console.log("Deleted doc", noteId);
    textArea.value = '';
    delete textArea.dataset.noteId;
    currentNoteId = null;
    loadNotes();
  });

  // (You can add similar logging for search, autoSave, etc.)
});
