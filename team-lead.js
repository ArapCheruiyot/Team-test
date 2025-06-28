import { initChat } from './chat.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  const settingsBtn  = document.getElementById('settings-btn');
  const contactsPane = document.getElementById('contact-chat-controls');
  settingsBtn?.addEventListener('click', () => {
    contactsPane.classList.toggle('controls-hidden');
  });

  const offersBtn = document.getElementById('open-offers-btn');
  if (offersBtn) {
    offersBtn.addEventListener('click', () => {
      window.open('https://arapcheruiyot.github.io/offer-search/', 'offerSearch', 'width=800,height=600,toolbar=no,menubar=no');
    });
  }

  const oldHeader = document.getElementById('chat-header');
  const chatSelect = document.createElement('select');
  chatSelect.id = 'chat-select';
  chatSelect.classList.add('chat-dropdown');
  chatSelect.innerHTML = `<option value="" selected>No chat selected</option>`;
  if (oldHeader) oldHeader.replaceWith(chatSelect);

  chatSelect.addEventListener('change', async () => {
    const chatId = chatSelect.value;
    if (!chatId) return;
    startListeningToMessages(chatId);
  });
});

const db   = window.db;
const auth = window.auth;
const params   = new URLSearchParams(window.location.search);
const isAgent  = params.get('asAgent') === 'true';

if (isAgent) {
  ['new-file','delete','add-contact-btn','add-contact-form','announcement-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.textContent += ' (Agent)';
}

let currentUser = null;
let leaderUid   = null;
let unsubscribeChat = null;

auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  leaderUid   = isAgent ? 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2' : user.uid;

  document.getElementById('welcome').textContent =
    `Welcome, ${user.displayName || user.email}!` + (isAgent ? ' (Agent)' : '');

  await loadNotes();
  await loadContacts();
  await loadAnnouncement();

  initChat(db, auth, leaderUid);
});

const postBtn = document.getElementById('post-announcement');
if (postBtn) {
  postBtn.addEventListener('click', async () => {
    const input = document.getElementById('announcement-input');
    const text  = input.value.trim();
    if (!text) return;
    try {
      await db.collection('users')
        .doc('A3HIWA6XWvhFcGdsM3o5IV0Qx3B2')
        .collection('announcement')
        .doc('latest')
        .set({
          text,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      input.value = '';
      alert('✅ Announcement posted!');
    } catch (e) {
      console.error('Error posting announcement:', e);
    }
  });
}

async function loadAnnouncement() {
  try {
    const doc = await db
      .collection('users').doc(leaderUid)
      .collection('announcement').doc('latest')
      .get();
    if (doc.exists && isAgent) {
      const { text } = doc.data();
      const banner   = document.getElementById('announcement-banner');
      const span     = document.getElementById('announcement-text-scroll');
      span.textContent = `📣 ${text}`;
      banner.classList.remove('hide');
    }
  } catch (e) {
    console.error("Error loading announcement:", e);
  }
}

const newBtn    = document.getElementById('new-file');
const delBtn    = document.getElementById('delete');
const fileNames = document.getElementById('file-names');
const textArea  = document.getElementById('text-input');
let saveTimeout = null;

async function loadNotes() {
  fileNames.innerHTML = '';
  try {
    const snap = await db.collection('users')
      .doc(leaderUid)
      .collection('notes')
      .orderBy('updatedAt','desc')
      .get();
    snap.forEach(doc => {
      const note = doc.data();
      const div  = document.createElement('div');
      div.className = 'note-item';
      div.textContent = note.title?.trim() || '(Untitled)';
      div.onclick     = () => openNote(doc.id, note);
      fileNames.appendChild(div);
    });
  } catch (e) {
    console.error('Error loading notes:', e);
  }
}

function openNote(id, note) {
  textArea.dataset.noteId = id;
  textArea.value = note.content || '';
  textArea.focus();
}

if (newBtn) {
  newBtn.addEventListener('click', async () => {
    if (isAgent) return;
    try {
      const ref = await db.collection('users').doc(leaderUid)
        .collection('notes')
        .add({
          title: '',
          content: '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      openNote(ref.id, { content: '' });
      await loadNotes();
    } catch (e) {
      console.error('Error creating note:', e);
    }
  });
}

if (delBtn) {
  delBtn.addEventListener('click', async () => {
    if (isAgent) return;
    const id = textArea.dataset.noteId;
    if (!id) return;
    try {
      await db.collection('users').doc(leaderUid)
        .collection('notes').doc(id).delete();
      textArea.value = '';
      delete textArea.dataset.noteId;
      await loadNotes();
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  });
}

textArea.addEventListener('input', () => {
  if (isAgent) return;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const id      = textArea.dataset.noteId;
    if (!id) return;
    const content = textArea.value.trim();
    const title   = content.split('\n')[0]?.trim() || '(Untitled)';
    try {
      await db.collection('users').doc(leaderUid)
        .collection('notes').doc(id)
        .update({
          title,
          content,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      await loadNotes();
    } catch (e) {
      console.error('Auto-save error:', e);
    }
  }, 500);
});

const addContactBtn  = document.getElementById('add-contact-btn');
const saveContactBtn = document.getElementById('save-contact');
const contactInput   = document.getElementById('contact-email');
const contactList    = document.getElementById('contact-list');

if (addContactBtn) {
  addContactBtn.addEventListener('click', () => {
    if (isAgent) return;
    document.getElementById('add-contact-form').style.display = 'block';
  });
}

if (saveContactBtn) {
  saveContactBtn.addEventListener('click', async () => {
    if (isAgent) return;
    const email = contactInput.value.trim().toLowerCase();
    if (!email) return;
    try {
      await db.collection('users').doc(leaderUid)
        .collection('contacts')
        .add({ email, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      contactInput.value = '';
      await loadContacts();
    } catch (e) {
      console.error('Error saving contact:', e);
    }
  });
}

async function loadContacts() {
  contactList.innerHTML = '';
  const chatSelect = document.getElementById('chat-select');
  if (chatSelect) {
    chatSelect.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
  }

  try {
    const snap = await db.collection('users').doc(leaderUid)
      .collection('contacts')
      .orderBy('createdAt','desc')
      .get();

    snap.forEach(doc => {
      const { email } = doc.data();
      const id        = doc.id;

      const li = document.createElement('li');
      li.textContent = `👤 ${email}`;
      li.onclick     = () => {
        if (chatSelect) {
          chatSelect.value = id;
          chatSelect.dispatchEvent(new Event('change'));
        }
      };
      contactList.appendChild(li);

      if (chatSelect) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.text  = email;
        chatSelect.appendChild(opt);
      }
    });
  } catch (e) {
    console.error('Failed to load contacts:', e);
  }
}

function startListeningToMessages(chatId) {
  const messagesDiv = document.getElementById('chat-messages');
  if (unsubscribeChat) unsubscribeChat();

  unsubscribeChat = db.collection('users').doc(leaderUid)
    .collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('timestamp')
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = '';
      snapshot.forEach(doc => {
        const { sender, text } = doc.data();
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble');
        bubble.classList.add(sender === currentUser.email ? 'sent' : 'received');
        bubble.textContent = text;
        messagesDiv.appendChild(bubble);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-message-btn');

sendBtn?.addEventListener('click', async () => {
  const text = chatInput.value.trim();
  const chatId = document.getElementById('chat-select')?.value;
  if (!text || !chatId) return;

  try {
    await db.collection('users').doc(leaderUid)
      .collection('chats').doc(chatId)
      .collection('messages').add({
        text,
        sender: currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    chatInput.value = '';
  } catch (e) {
    console.error('Failed to send message:', e);
  }
});
chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click(); // Trigger the send logic
  }
});

