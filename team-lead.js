// team-lead.js — Dashboard logic (notes, contacts, chat, announcements)
import { initChat } from './chat.js';

// — Module-wide state & Firebase handles —
let currentUser = null;
let leaderUid   = null;
let unsubscribeChat = null;

const db      = window.db;
const auth    = window.auth;
const params  = new URLSearchParams(window.location.search);
const isAgent = params.get('asAgent') === 'true';

// Immediately hide agent-only controls on page load
if (isAgent) {
  ['new-file','delete','add-contact-btn','add-contact-form','announcement-panel']
    .forEach(id => document.getElementById(id)?.style.setProperty('display','none'));
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  // 1) Gear button toggles contacts pane
  document.getElementById('settings-btn')
    ?.addEventListener('click', () => {
      document.getElementById('contact-chat-controls')
        .classList.toggle('controls-hidden');
    });

  // 2) Offers Finder popup
  document.getElementById('open-offers-btn')
    ?.addEventListener('click', () => {
      window.open(
        'https://arapcheruiyot.github.io/offer-search/',
        'offerSearch',
        'width=800,height=600,toolbar=no,menubar=no'
      );
    });

  // 3) Replace static header with <select>
  const oldH = document.getElementById('chat-header');
  const sel  = document.createElement('select');
  sel.id     = 'chat-select';
  sel.classList.add('chat-dropdown');
  sel.innerHTML = `<option value="" selected>No chat selected</option>`;
  if (oldH) oldH.replaceWith(sel);

  // 4) On dropdown change, listen to messages
  sel.addEventListener('change', () => {
    const chatId = sel.value;
    if (!chatId) return;
    startListeningToMessages(chatId);
  });

  // 5) Show & save new contact
  document.getElementById('add-contact-btn')
    ?.addEventListener('click', () => {
      document.getElementById('add-contact-form').style.display = 'block';
    });
  document.getElementById('save-contact')
    ?.addEventListener('click', async () => {
      const input = document.getElementById('contact-email');
      const email = input.value.trim().toLowerCase();
      if (!email) {
        alert('Please enter an email.');
        return;
      }
      try {
        await db.collection('users').doc(leaderUid)
          .collection('contacts')
          .add({ email, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        input.value = '';
        document.getElementById('add-contact-form').style.display = 'none';
        await loadContacts();
      } catch (e) {
        console.error(e);
        alert('Failed to save contact.');
      }
    });

  // 6) Post announcement
  document.getElementById('post-announcement')
    ?.addEventListener('click', async () => {
      const txt = document.getElementById('announcement-input').value.trim();
      if (!txt) return;
      try {
        await db.collection('users').doc('A3HIWA6XWvhFcGdsM3o5IV0Qx3B2')
          .collection('announcement').doc('latest')
          .set({ text: txt, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        document.getElementById('announcement-input').value = '';
        alert('✅ Announcement posted!');
      } catch (e) {
        console.error(e);
        alert('Failed to post announcement.');
      }
    });

  // 7) Auth guard + load everything
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = 'index.html';
    currentUser = user;
    leaderUid   = isAgent
      ? 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2'
      : user.uid;
    document.getElementById('welcome').textContent =
      `Welcome, ${user.displayName||user.email}!` + (isAgent? ' (Agent)' : '');

    await loadNotes();
    await loadContacts();
    await loadAnnouncement();
    initChat(db, auth, leaderUid);
  });

  // 8) Send message button
  document.getElementById('send-message-btn')
    ?.addEventListener('click', async () => {
      const chatId = document.getElementById('chat-select').value;
      const input  = document.getElementById('chat-input');
      const txt    = input.value.trim();
      if (!chatId || !txt) return;
      try {
        await db.collection('users').doc(leaderUid)
          .collection('chats').doc(chatId)
          .collection('messages').add({
            text: txt,
            sender: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        input.value = '';
      } catch (e) {
        console.error(e);
      }
    });
});


// — Loaders & helpers —

// Announcements
async function loadAnnouncement() {
  try {
    const doc = await db.collection('users').doc(leaderUid)
      .collection('announcement').doc('latest').get();
    if (doc.exists && isAgent) {
      document.getElementById('announcement-text-scroll').textContent =
        `📣 ${doc.data().text}`;
      document.getElementById('announcement-banner').classList.remove('hide');
    }
  } catch (e) { console.error(e); }
}

// Notes
async function loadNotes() {
  const fileNames = document.getElementById('file-names');
  const textArea  = document.getElementById('text-input');
  fileNames.innerHTML = '';
  const snap = await db.collection('users').doc(leaderUid)
    .collection('notes').orderBy('updatedAt','desc').get();
  snap.forEach(doc => {
    const { title='', content='' } = doc.data();
    const d = document.createElement('div');
    d.className = 'note-item';
    d.textContent = title || '(Untitled)';
    d.onclick = () => {
      textArea.dataset.noteId = doc.id;
      textArea.value = content;
      textArea.focus();
    };
    fileNames.appendChild(d);
  });
}

// Contacts
async function loadContacts() {
  const ul = document.getElementById('contact-list');
  const sel = document.getElementById('chat-select');
  ul.innerHTML = '';
  sel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  const snap = await db.collection('users').doc(leaderUid)
    .collection('contacts').orderBy('createdAt','desc').get();
  snap.forEach(doc => {
    const { email } = doc.data();
    const id = doc.id;

    // UL item
    const li = document.createElement('li');
    li.textContent = `👤 ${email}`;
    li.onclick = () => {
      sel.value = id;
      sel.dispatchEvent(new Event('change'));
    };
    ul.appendChild(li);

    // SELECT option
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = email;
    sel.appendChild(opt);
  });
}

// Live chat
function startListeningToMessages(chatId) {
  const box = document.getElementById('chat-messages');
  if (unsubscribeChat) unsubscribeChat();
  unsubscribeChat = db.collection('users').doc(leaderUid)
    .collection('chats').doc(chatId)
    .collection('messages').orderBy('timestamp')
    .onSnapshot(snap => {
      box.innerHTML = '';
      snap.forEach(d => {
        const { sender, text } = d.data();
        const b = document.createElement('div');
        b.className = `chat-bubble ${(sender===currentUser.email)?'sent':'received'}`;
        b.textContent = text;
        box.appendChild(b);
      });
      box.scrollTop = box.scrollHeight;
    });
}
