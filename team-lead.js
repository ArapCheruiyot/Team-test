// team-lead.js — Dashboard logic (notes, contacts, chat, announcements)
import { initChat } from './chat.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  // 1) Gear-button → toggle contact pane
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

  // 3) Wire up the dropdown (already in your HTML)
  const chatSelect = document.getElementById('chat-select');
  if (!chatSelect) {
    console.error('❌ [team-lead.js] <select id="chat-select"> not found!');
  } else {
    // Debug log to confirm we found it
    console.log('🟢 chat-select found:', chatSelect);

    chatSelect.addEventListener('change', async () => {
      const chatId = chatSelect.value;
      console.log('🟡 Chat selected:', chatId);
      if (!chatId) return;
      startListeningToMessages(chatId);
    });
  }

  // Everything else (auth listener, loadNotes, etc.) lives below…

});

// ————————————————————————————————————————————————————————————————

const db   = window.db;
const auth = window.auth;

// Agent vs owner
const params  = new URLSearchParams(window.location.search);
const isAgent = params.get('asAgent') === 'true';

// Hide panels for agents
if (isAgent) {
  ['new-file','delete','add-contact-btn','add-contact-form','announcement-panel']
    .forEach(id => document.getElementById(id)?.remove());
  document.getElementById('welcome').textContent += ' (Agent)';
}

let currentUser = null;
let leaderUid   = null;
let unsubscribeChat = null;

// Auth guard & initial loads
auth.onAuthStateChanged(async user => {
  if (!user) {
    return window.location.href = 'index.html';
  }
  currentUser = user;
  leaderUid   = isAgent
    ? 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2'
    : user.uid;

  // Welcome text
  document.getElementById('welcome').textContent =
    `Welcome, ${user.displayName || user.email}!` + (isAgent ? ' (Agent)' : '');

  // Load data panels
  await loadNotes();
  await loadContacts();
  await loadAnnouncement();

  // Kick off chat engine (if needed)
  initChat(db, auth, leaderUid);
});

// — ANNOUNCEMENTS ————————————————————————————————————————————————

document.getElementById('post-announcement')
  ?.addEventListener('click', async () => {
    const input = document.getElementById('announcement-input');
    const text = input.value.trim();
    if (!text) return;
    try {
      await db.collection('users')
        .doc('A3HIWA6XWvhFcGdsM3o5IV0Qx3B2')
        .collection('announcement')
        .doc('latest')
        .set({ text, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
      input.value = '';
      alert('✅ Announcement posted!');
    } catch (e) {
      console.error('Error posting announcement:', e);
    }
  });

async function loadAnnouncement() {
  try {
    const doc = await db
      .collection('users').doc(leaderUid)
      .collection('announcement').doc('latest')
      .get();
    if (doc.exists && isAgent) {
      const { text } = doc.data();
      document.getElementById('announcement-text-scroll').textContent = `📣 ${text}`;
      document.getElementById('announcement-banner').classList.remove('hide');
    }
  } catch (e) {
    console.error('Error loading announcement:', e);
  }
}

// — NOTES ——————————————————————————————————————————————————————————

const fileNames = document.getElementById('file-names');
const textArea  = document.getElementById('text-input');
let saveTimeout = null;

async function loadNotes() {
  fileNames.innerHTML = '';
  try {
    const snap = await db
      .collection('users').doc(leaderUid)
      .collection('notes')
      .orderBy('updatedAt','desc')
      .get();
    snap.forEach(doc => {
      const { title, content } = doc.data();
      const div = document.createElement('div');
      div.className = 'note-item';
      div.textContent = title?.trim() || '(Untitled)';
      div.onclick = () => {
        textArea.dataset.noteId = doc.id;
        textArea.value = content || '';
        textArea.focus();
      };
      fileNames.appendChild(div);
    });
  } catch (e) {
    console.error('Error loading notes:', e);
  }
}

// New, delete, and auto-save handlers…

// — CONTACTS & CHAT DROPDOWN —————————————————————————————————————————

const contactList = document.getElementById('contact-list');

async function loadContacts() {
  contactList.innerHTML = '';
  const chatSelect = document.getElementById('chat-select');
  chatSelect?.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  try {
    const snap = await db
      .collection('users').doc(leaderUid)
      .collection('contacts')
      .orderBy('createdAt','desc')
      .get();

    snap.forEach(doc => {
      const { email } = doc.data();
      const id        = doc.id;

      // 1) populate the UL
      const li = document.createElement('li');
      li.textContent = `👤 ${email}`;
      li.onclick = () => {
        chatSelect.value = id;
        chatSelect.dispatchEvent(new Event('change'));
      };
      contactList.appendChild(li);

      // 2) populate the SELECT
      if (chatSelect) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = email;
        chatSelect.appendChild(opt);
      }
    });
  } catch (e) {
    console.error('Failed to load contacts:', e);
  }
}

// — LIVE CHAT LISTENER & SENDER ————————————————————————————————————

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
        bubble.classList.add('chat-bubble', sender === currentUser.email ? 'sent' : 'received');
        bubble.textContent = text;
        messagesDiv.appendChild(bubble);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// Send button
document.getElementById('send-message-btn')
  ?.addEventListener('click', async () => {
    const chatId = document.getElementById('chat-select')?.value;
    const chatInput = document.getElementById('chat-input');
    const text = chatInput.value.trim();
    if (!chatId || !text) return;

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
