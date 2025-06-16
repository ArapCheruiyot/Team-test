// team-lead.js

const db = window.db;
let currentUser = null;
let currentNoteId = null;
let saveTimeout = null;

// Cache DOM elements
const newBtn = document.getElementById('new-file');
const delBtn = document.getElementById('delete');
const searchBtn = document.getElementById('search');
const searchInput = document.getElementById('search-input');
const fileNames = document.getElementById('file-names');
const textArea = document.getElementById('text-input');

// Wait for auth to be ready
firebase.auth().onAuthStateChanged(user => {
  if (!user) return;
  currentUser = user;
  loadNotes();
});

// Load all notes for the current user
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
  textArea.value = note.content;
  currentNoteId = id;
  textArea.dataset.noteId = id;
}

// Create a new note (no prompt, just blank)
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
  loadNotes();
});

// Delete note
delBtn.addEventListener('click', async () => {
  const noteId = textArea.dataset.noteId;
  if (!noteId) return alert('No note selected.');

  await db
    .collection('users')
    .doc(currentUser.uid)
    .collection('notes')
    .doc(noteId)
    .delete();

  currentNoteId = null;
  textArea.value = '';
  delete textArea.dataset.noteId;
  loadNotes();
});

// Show search field
searchBtn.addEventListener('click', () => {
  searchInput.style.display = 'block';
  searchInput.focus();
});

// Filter notes in the sidebar
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  document.querySelectorAll('.note-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

// Save note on blur or CTRL/CMD + Enter
textArea.addEventListener('blur', saveCurrentNote);
textArea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    saveCurrentNote();
  }
});

// Auto-save with first line as title
textArea.addEventListener('input', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => autoSaveNote(), 500); // Debounced
});

async function autoSaveNote() {
  const content = textArea.value;
  const title = content.split('\n')[0].trim();
  const noteId = textArea.dataset.noteId;

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

  loadNotes(); // Refresh sidebar
}

// Manual save
async function saveCurrentNote() {
  const noteId = textArea.dataset.noteId;
  const content = textArea.value;

  if (!noteId || !currentUser) return;

  await db
    .collection('users')
    .doc(currentUser.uid)
    .collection('notes')
    .doc(noteId)
    .update({
      content,
      title: content.split('\n')[0].trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}
