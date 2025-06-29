// notepad.js — Auto-create, auto-save, and edit notes
const db = window.db;
const auth = window.auth;

let currentUser = null;
let leaderUid = null;
let selectedNoteId = null;
let isNewNote = true;

// DOM elements
const fileList  = document.getElementById('file-names');
const textInput = document.getElementById('text-input');

// Watch for auth and load existing notes
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;
  leaderUid = user.uid;
  loadNotes();
});

// ✅ Load notes to sidebar
async function loadNotes() {
  fileList.innerHTML = '';
  const snapshot = await db.collection('users').doc(leaderUid)
    .collection('notes')
    .orderBy('createdAt', 'desc')
    .get();

  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('div');
    li.className = 'file-name';
    li.textContent = data.title || '(Untitled)';
    li.addEventListener('click', () => loadNote(doc.id));
    fileList.appendChild(li);
  });
}

// ✅ Load a single note for editing
async function loadNote(noteId) {
  selectedNoteId = noteId;
  isNewNote = false;

  const doc = await db.collection('users').doc(leaderUid)
    .collection('notes').doc(noteId).get();

  const content = doc.data()?.content || '';
  textInput.value = content;
}

// ✅ Auto-save logic on typing
textInput.addEventListener('input', async () => {
  const fullText = textInput.value;
  const lines = fullText.split('\n');
  const title = lines[0] || '(Untitled)';
  const content = fullText;

  // 🆕 If this is a brand new note, create it first
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
    await loadNotes();  // Refresh the note list
    return;
  }

  // 📝 Update existing note
  if (selectedNoteId) {
    await db.collection('users').doc(leaderUid)
      .collection('notes').doc(selectedNoteId)
      .update({ title, content });
  }
});
