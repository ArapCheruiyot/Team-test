// notepad.js — Clean version with debounce + accurate title handling
const db = window.db;
const auth = window.auth;

let currentUser = null;
let leaderUid = null;
let selectedNoteId = null;
let isNewNote = true;
let debounceTimer = null;

// DOM
const fileList    = document.getElementById('file-names');
const textInput   = document.getElementById('text-input');
const newFileBtn  = document.getElementById('new-file');
const deleteBtn   = document.getElementById('delete');
const searchBtn   = document.getElementById('search');
const searchInput = document.getElementById('search-input');

// ✅ Auth and load notes
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;
  leaderUid = user.uid;

  loadNotes();
  startFreshNote();
});

// ✅ Start blank note
function startFreshNote() {
  textInput.value = '';
  selectedNoteId = null;
  isNewNote = true;
  document.querySelectorAll('.file-name').forEach(el => el.classList.remove('active'));
}

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
    li.dataset.id = doc.id;
    li.addEventListener('click', () => loadNote(doc.id));
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

// ✅ Highlight selected note
function highlightSelected(noteId) {
  document.querySelectorAll('.file-name').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.id === noteId) {
      el.classList.add('active');
    }
  });
}

// ✅ Auto-save with debounce
textInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveNote, 400);
});

// ✅ Save or update note
async function saveNote() {
  const content = textInput.value;
  const title   = content.split('\n')[0]; // Entire first line, as-is

  if (!content.trim()) return; // Don’t save empty notes

  if (isNewNote) {
    const docRef = await db.collection('users').doc(leaderUid)
      .collection('notes').add({
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
}

// ✅ New note button
newFileBtn.addEventListener('click', () => {
  startFreshNote();
});

// ✅ Delete note
deleteBtn.addEventListener('click', async () => {
  if (!selectedNoteId) return alert('No note selected.');

  const confirmed = confirm('Are you sure you want to delete this note?');
  if (!confirmed) return;

  await db.collection('users').doc(leaderUid)
    .collection('notes').doc(selectedNoteId).delete();

  startFreshNote();
  await loadNotes();
});

// ✅ Toggle search
searchBtn.addEventListener('click', () => {
  searchInput.style.display = searchInput.style.display === 'none' ? 'block' : 'none';
});
