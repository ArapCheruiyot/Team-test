// team-lead.js — Dashboard logic (notes, contacts, chat, announcements)
import { initChat } from './chat.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  // 1) Gear‐button → toggle contact pane
  const settingsBtn  = document.getElementById('settings-btn');
  const contactsPane = document.getElementById('contact-chat-controls');
  settingsBtn?.addEventListener('click', () => {
    contactsPane.classList.toggle('controls-hidden');
  });

  // 2) Offers Finder popup
  const offersBtn = document.getElementById('open-offers-btn');
  offersBtn?.addEventListener('click', () => {
    window.open(
      'https://arapcheruiyot.github.io/offer-search/',
      'offerSearch',
      'width=800,height=600,toolbar=no,menubar=no'
    );
  });

  // 3) Replace static header with <select>
  const oldHeader = document.getElementById('chat-header');
  const chatSelect = document.createElement('select');
  chatSelect.id = 'chat-select';
  chatSelect.classList.add('chat-dropdown');
  chatSelect.innerHTML = `<option value="" selected>No chat selected</option>`;
  oldHeader?.replaceWith(chatSelect);

  // 4) When user picks a contact…
  chatSelect.addEventListener('change', async () => {
    const chatId      = chatSelect.value;
    const messagesDiv = document.getElementById('chat-messages');
    messagesDiv.innerHTML = '';    // clear old
    if (!chatId) return;           // placeholder
    await loadChatMessages(chatId); // fetch & render bubbles
  });

  // Defer the rest until auth state
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = 'index.html';
    currentUser = user;
    leaderUid   = isAgent ? AGENT_LEADER_UID : user.uid;
    document.getElementById('welcome').textContent =
      `Welcome, ${user.displayName||user.email}!` + (isAgent?' (Agent)':'');

    // Load all panels
    await Promise.all([ loadNotes(), loadContacts(), loadAnnouncement() ]);
    initChat(db, auth, leaderUid);
  });
});

// ————————————————————————————————————————————
// Globals & helpers
// ————————————————————————————————————————————
const db   = window.db;
const auth = window.auth;
const AGENT_LEADER_UID = 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2';
const params   = new URLSearchParams(window.location.search);
const isAgent  = params.get('asAgent') === 'true';
let currentUser = null;
let leaderUid   = null;

// Hide owner-only panels for agents
if (isAgent) {
  ['new-file','delete','add-contact-btn','add-contact-form','announcement-panel']
    .forEach(id => document.getElementById(id)?.remove());
}

// ————————————————————————————————————————————
// ANNOUNCEMENTS
// ————————————————————————————————————————————
const postBtn = document.getElementById('post-announcement');
postBtn?.addEventListener('click', async () => {
  const input = document.getElementById('announcement-input');
  const text  = input.value.trim();
  if (!text) return;
  await db
    .collection('users').doc(AGENT_LEADER_UID)
    .collection('announcement').doc('latest')
    .set({ text, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  input.value = '';
  alert('✅ Announcement posted!');
});

async function loadAnnouncement() {
  const doc = await db
    .collection('users').doc(AGENT_LEADER_UID)
    .collection('announcement').doc('latest')
    .get();
  if (doc.exists && isAgent) {
    const { text } = doc.data();
    document.getElementById('announcement-text-scroll').textContent = `📣 ${text}`;
    document.getElementById('announcement-banner').classList.remove('hide');
  }
}

// ————————————————————————————————————————————
// NOTES
// ————————————————————————————————————————————
const newBtn    = document.getElementById('new-file');
const delBtn    = document.getElementById('delete');
const fileNames = document.getElementById('file-names');
const textArea  = document.getElementById('text-input');
let saveTimeout = null;

newBtn?.addEventListener('click', createNote);
delBtn?.addEventListener('click', deleteNote);
textArea.addEventListener('input', autoSaveNote);

async function loadNotes() {
  fileNames.innerHTML = '';
  const snap = await db.collection('users').doc(leaderUid)
    .collection('notes').orderBy('updatedAt','desc').get();
  snap.forEach(doc => {
    const note = doc.data();
    const div  = document.createElement('div');
    div.className = 'note-item';
    div.textContent = note.title?.trim() || '(Untitled)';
    div.onclick = () => openNote(doc.id, note);
    fileNames.appendChild(div);
  });
}
function openNote(id, note) {
  textArea.dataset.noteId = id;
  textArea.value = note.content || '';
  textArea.focus();
}
async function createNote() {
  if (isAgent) return;
  const ref = await db.collection('users').doc(leaderUid)
    .collection('notes').add({
      title: '', content: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  openNote(ref.id, {content:''});
  await loadNotes();
}
async function deleteNote() {
  if (isAgent) return;
  const id = textArea.dataset.noteId; if (!id) return;
  await db.collection('users').doc(leaderUid)
    .collection('notes').doc(id).delete();
  textArea.value = ''; delete textArea.dataset.noteId;
  await loadNotes();
}
function autoSaveNote() {
  if (isAgent) return;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const id = textArea.dataset.noteId; if (!id) return;
    const content = textArea.value.trim();
    const title   = content.split('\n')[0]?.trim() || '(Untitled)';
    await db.collection('users').doc(leaderUid)
      .collection('notes').doc(id).update({
        title, content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    await loadNotes();
  }, 500);
}

// ————————————————————————————————————————————
// CONTACTS + DROPDOWN + CHAT
// ————————————————————————————————————————————
const addContactBtn  = document.getElementById('add-contact-btn');
const saveContactBtn = document.getElementById('save-contact');
const contactInput   = document.getElementById('contact-email');
const contactList    = document.getElementById('contact-list');

addContactBtn?.addEventListener('click', () =>
  document.getElementById('add-contact-form').style.display = 'block'
);
saveContactBtn?.addEventListener('click', async () => {
  if (!contactInput.value.trim()) return;
  await db.collection('users').doc(leaderUid)
    .collection('contacts').add({
      email: contactInput.value.trim().toLowerCase(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  contactInput.value = '';
  await loadContacts();
});

async function loadContacts() {
  contactList.innerHTML = '';
  const chatSelect = document.getElementById('chat-select');
  // remove old options (keep placeholder)
  chatSelect.querySelectorAll('option[value!=""]').forEach(o=>o.remove());
  const snap = await db.collection('users').doc(leaderUid)
    .collection('contacts').orderBy('createdAt','desc').get();
  snap.forEach(doc => {
    const { email } = doc.data();
    const id        = doc.id;
    // populate <ul>
    const li = document.createElement('li');
    li.textContent = `👤 ${email}`;
    li.onclick     = () => {
      chatSelect.value = id;
      chatSelect.dispatchEvent(new Event('change'));
    };
    contactList.appendChild(li);
    // populate <select>
    const opt = document.createElement('option');
    opt.value = id;
    opt.text  = email;
    chatSelect.appendChild(opt);
  });
}

// ————————————————————————————————————————————
// CHAT MESSAGES
// ————————————————————————————————————————————
async function loadChatMessages(chatId) {
  const messagesDiv = document.getElementById('chat-messages');
  messagesDiv.innerHTML = ''; // clear
  try {
    const snap = await db.collection('users').doc(leaderUid)
      .collection('chats').doc(chatId)
      .collection('messages').orderBy('timestamp','asc')
      .get();
    snap.forEach(doc => {
      const { sender, text } = doc.data();
      const bubble = document.createElement('div');
      bubble.classList.add('chat-bubble');
      bubble.classList.add(sender === currentUser.email ? 'sent' : 'received');
      bubble.textContent = text;
      messagesDiv.appendChild(bubble);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (e) {
    console.error('Error loading chat messages:', e);
    messagesDiv.innerHTML = '<p class="no-result">Failed to load messages.</p>';
  }
}
