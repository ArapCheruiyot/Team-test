// notepad.js — Auto-create, edit, delete, and list notes
const db = window.db;
const auth = window.auth;

let currentUser = null;
let leaderUid = null;
let selectedNoteId = null;
let isNewNote = true;

// DOM
const fileList    = document.getElementById('file-names');
const textInput   = document.getElementById('text-input');
const newFileBtn  = document.getElementById('new-file');
const deleteBtn   = document.getElementById('delete');
const searchBtn   = document.getElementById('search');
const searchInput = document.getElementById('search-input');

// ✅ Auth and Load Notes
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;
  leaderUid = user.uid;
  loadNotes();
});

// ✅ Load all notes
async function loadNotes() {
  fileList.innerHTML = '';
  const snapshot = await db.collection('users').doc(leaderUid)
    .collection('notes').orderBy('createdAt', 'desc').get();

  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('div');
    li.className = 'file-name';
    li.textContent = data.title || '(Untitled)';
    li.addEventListener('click', () => loadNote(doc.id));
    li.dataset.id = doc.id;
    fileList.appendChild(li);
  });
}

// ✅ Load one note to editor
async function loadNote(noteId) {
  selectedNoteId = noteId;
  isNewNote = false;

  const doc = await db.collection('users').doc(leaderUid)
    .collection('notes').doc(noteId).get();

  const content = doc.data()?.content || '';
  textInput.value = content;
  highlightSelected(noteId);
}

// ✅ Highlight active note
function highlightSelected(noteId) {
  document.querySelectorAll('.file-name').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.id === noteId) {
      el.classList.add('active');
    }
  });
}

// ✅ Auto-save on input
textInput.addEventListener('input', async () => {
  const fullText = textInput.value;
  const lines = fullText.split('\n');
  const title = lines[0] || '(Untitled)';
  const content = fullText;

  if (isNewNote) {
    const docRef = await db.collection('users').doc(leaderUid)
      .collection('notes')
      .add({
        title,
        content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    selectedNoteId = docRef.id;
    isNewNote = false;
    await loadNotes();
    highlightSelected(selectedNoteId);
  } else if (selectedNoteId) {
    await db.collection('users').doc(leaderUid)
      .collection('notes').doc(selectedNoteId)
      .update({ title, content });
  }
});

// ✅ New Note Button
newFileBtn.addEventListener('click', () => {
  selectedNoteId = null;
  isNewNote = true;
  textInput.value = '';
  document.querySelectorAll('.file-name').forEach(el => el.classList.remove('active'));
});

// ✅ Delete Button
deleteBtn.addEventListener('click', async () => {
  if (!selectedNoteId) {
    alert('No note selected.');
    return;
  }

  const confirmDelete = confirm('Are you sure you want to delete this note?');
  if (!confirmDelete) return;

  await db.collection('users').doc(leaderUid)
    .collection('notes').doc(selectedNoteId).delete();

  selectedNoteId = null;
  textInput.value = '';
  isNewNote = true;
  await loadNotes();
});

// ✅ Optional: Toggle search input (can be enhanced later)
searchBtn.addEventListener('click', () => {
  searchInput.style.display = searchInput.style.display === 'none' ? 'block' : 'none';
});
