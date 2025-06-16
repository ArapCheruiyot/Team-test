// team-lead.js

// 🔧 Avoid redeclaring variables already set in HTML
db = window.db;
auth = window.auth;

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

// Wait for user to be authenticated
auth.onAuthStateChanged(user => {
  if (!user) return;
  currentUser = user;
  loadNotes();
});

// Load notes from Firestore
async function loadNotes() {
  fileNames.innerHTML = '';
  const snapshot = await db
    .collection('users')
    .doc(currentUser.uid)
    .collection('notes')
    .orderBy('createdAt', 'desc')
    .get();

  snapshot.forEach(doc => {
    const note = doc.data();
    const item = document.createElement('div');
    item.textContent = note.title || '(Untitled)';
    item.className = 'note-item';
    item.onclick = () => openNote(doc.id, note);
    fileNames.appendChild(item);
  });
}

// Open a note
function openNote(id, note) {
  currentNoteId = id;
  textArea.dataset.noteId = id;
  textArea.value = note.content;
}

// Create a new note
newBtn.addEventListener('click', async () => {
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
  textArea.value = '';
  textArea.dataset.noteId = currentNoteId;
  textArea.focus();
  loadNotes();
});

// Delete current note
delBtn.addEventListener('click', async () => {
  const noteId = textArea.dataset.noteId;
  if (!noteId) return alert('No note selected.');

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
});

// Search button toggle
searchBtn.addEventListener('click', () => {
  searchInput.style.display = 'block';
  searchInput.focus();
});

// Filter note titles in the sidebar
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  document.querySelectorAll('.note-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

// Save on blur or Ctrl/Cmd + Enter
textArea.addEventListener('blur', saveCurrentNote);
textArea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    saveCurrentNote();
  }
});

// Auto-save on typing with first line as title
textArea.addEventListener('input', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(autoSaveNote, 400);
});

// Auto save implementation
async function autoSaveNote() {
  const noteId = textArea.dataset.noteId;
  const content = textArea.value;
  const title = content.split('\n')[0].trim();

  if (!noteId || !currentUser) return;

  await db
    .collection('users')
    .doc(currentUser.uid)
    .collection('notes')
    .doc(noteId)
    .update({
      content,
      title,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

  loadNotes(); // Refresh note list titles
}

// Manual save logic
async function saveCurrentNote() {
  const noteId = textArea.dataset.noteId;
  const content = textArea.value;
  const title = content.split('\n')[0].trim();

  if (!noteId || !currentUser) return;

  await db
    .collection('users')
    .doc(currentUser.uid)
    .collection('notes')
    .doc(noteId)
    .update({
      content,
      title,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}
