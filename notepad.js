// notepad.js — handles note saving, loading, deleting
const db = window.db;
const auth = window.auth;

let currentUser = null;
let leaderUid = null;
let selectedNoteId = null;

// DOM elements
const newBtn     = document.getElementById('new-file');
const deleteBtn  = document.getElementById('delete');
const searchBtn  = document.getElementById('search');
const searchInput = document.getElementById('search-input');
const fileList   = document.getElementById('file-names');
const textInput  = document.getElementById('text-input');

// ✅ Wait for auth then load notes
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;
  leaderUid = user.uid;

  loadNotes();
});

// ✅ Load all notes from Firestore
async function loadNotes() {
  fileList.innerHTML = '';
  const snapshot = await db.collection('users').doc(leaderUid)
    .collection('notes')
    .orderBy('createdAt', 'desc')
    .get();

  snapshot.forEach(doc => {
    const li = document.createElement('div');
    li.className = 'file-name';
    li.textContent = doc.data().title || '(Untitled)';
    li.addEventListener('click', () => loadNote(doc.id));
    fileList.appendChild(li);
  });
}

// ✅ Load a specific note
async function loadNote(noteId) {
  selectedNoteId = noteId;
  const doc = await db.collection('users').doc(leaderUid)
    .collection('notes').doc(noteId).get();

  const data = doc.data();
  textInput.value = data?.content || '';
}

// ✅ New Note
newBtn?.addEventListener('click', async () => {
  const title = prompt("Enter note title:");
  if (!title) return;

  const docRef = await db.collection('users').doc(leaderUid)
    .collection('notes')
    .add({
      title,
      content: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

  selectedNoteId = docRef.id;
  textInput.value = '';
  await loadNotes();
});

// ✅ Delete current note
deleteBtn?.addEventListener('click', async () => {
  if (!selectedNoteId) return alert('No note selected');

  const confirmDelete = confirm('Delete this note?');
  if (!confirmDelete) return;

  await db.collection('users').doc(leaderUid)
    .collection('notes').doc(selectedNoteId).delete();

  selectedNoteId = null;
  textInput.value = '';
  await loadNotes();
});

// ✅ Save note on typing (auto-save)
textInput?.addEventListener('input', () => {
  if (!selectedNoteId) return;
  db.collection('users').doc(leaderUid)
    .collection('notes').doc(selectedNoteId)
    .update({ content: textInput.value });
});

// ✅ Toggle search input visibility
searchBtn?.addEventListener('click', () => {
  searchInput.style.display =
    (searchInput.style.display === 'none') ? 'block' : 'none';
});
