// team-lead.js

// Get Firestore instance
const db = firebase.firestore();
let currentUser = null;

// Cache DOM elements
const newBtn      = document.getElementById('new-file');
const delBtn      = document.getElementById('delete');
const searchBtn   = document.getElementById('search');
const searchInput = document.getElementById('search-input');
const fileNames   = document.getElementById('file-names');
const textArea    = document.getElementById('text-input');

let currentNoteId = null;

// Wait for auth to be ready
firebase.auth().onAuthStateChanged(user => {
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

// Open a note into the textarea
function openNote(id, note) {
  textArea.value = note.content;
  textArea.dataset.noteId = id;
  currentNoteId = id;
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

  currentNoteId = docRef.id;
  textArea.value = '';
  textArea.dataset.noteId = currentNoteId;
  loadNotes(); // Refresh list
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

// Search notes by title
searchBtn.addEventListener('click', () => {
  searchInput.style.display = 'block';
  searchInput.focus();
});

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  document.querySelectorAll('.note-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q)
      ? ''
      : 'none';
  });
});

// Auto-save on blur or Enter key
textArea.addEventListener('blur', saveCurrentNote);
textArea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    saveCurrentNote();
  }
});

// Auto‑update content & title on typing
textArea.addEventListener('input', async () => {
  const content = textArea.value;
  const title = content.split('\n')[0].trim(); // first line as title

  if (!currentNoteId) return;

  await db
    .collection('users')
    .doc(currentUser.uid)
    .collection('notes')
    .doc(currentNoteId)
    .update({ content, title });

  loadNotes(); // Refresh sidebar titles
});

// Save note explicitly
async function saveCurrentNote() {
  const noteId = textArea.dataset.noteId;
  if (!noteId) return;
  await db
    .collection('users')
    .doc(currentUser.uid)
    .collection('notes')
    .doc(noteId)
    .update({ content: textArea.value });
}
