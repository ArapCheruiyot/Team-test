// team-lead.js — Dashboard logic (contacts, forums, announcements, notepad, and chat)
import {
  initChat
} from './chat.js';

import {
  initNotepad
} from './notepad.js';

// — App state & Firebase handles —
let currentUser = null;
let leaderUid   = null;

const db      = window.db;
const auth    = window.auth;
const isAgent = (new URLSearchParams(window.location.search)).get('asAgent') === 'true';

// Hide agent‐only controls immediately
if (isAgent) {
  [
    'new-file',
    'delete',
    'add-contact-btn',
    'add-contact-form',
    'announcement-panel'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  console.log("✅ team-lead.js initialized");

  // 1) Toggle contacts panel
  const settingsBtn = document.getElementById('settings-btn');
  settingsBtn?.addEventListener('click', () => {
    document.getElementById('contact-chat-controls')?.classList.toggle('controls-hidden');
  });

  // 2) Open external offers finder
  document.getElementById('open-offers-btn')?.addEventListener('click', () => {
    window.open(
      'https://arapcheruiyot.github.io/offer-search/',
      'offerSearch',
      'width=800,height=600'
    );
  });

  // 3) Create new forum
  const newForumBtn = document.getElementById('new-forum-btn');
  const newForumForm = document.getElementById('new-forum-form');
  const saveForumBtn = document.getElementById('save-forum-btn');

  if (newForumBtn && newForumForm && saveForumBtn) {
    newForumBtn.addEventListener('click', () => {
      newForumForm.style.display = 'block';
    });

    saveForumBtn.addEventListener('click', async () => {
      const nameEl = document.getElementById('forum-name');
      const name = nameEl.value.trim();
      if (!name) return alert('Enter a forum name');

      await db.collection('users').doc(leaderUid)
        .collection('forums')
        .add({
          name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      nameEl.value = '';
      newForumForm.style.display = 'none';
      await loadContactsAndForums();
    });
  }

  // 4) Create chat dropdown <select> UI
  const hdr = document.getElementById('chat-header');
  const select = document.createElement('select');
  select.id = 'chat-select';
  select.className = 'chat-dropdown';
  select.innerHTML = '<option value="" selected>No conversation selected</option>';
  if (hdr?.parentNode) hdr.parentNode.replaceChild(select, hdr);

  // 5) Auth and initialization
  auth.onAuthStateChanged(async function(u) {
    if (!u) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = u;
    leaderUid = isAgent ? 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2' : u.uid;

    document.getElementById('welcome').textContent =
      'Welcome, ' + (u.displayName || u.email) + (isAgent ? ' (Agent)' : '');

    await loadContactsAndForums();
    await loadAnnouncement();
    initNotepad(db, auth, leaderUid);
    initChat(db, auth, leaderUid);
  });
});

// — Load contacts & forums into sidebar + dropdown —
async function loadContactsAndForums() {
  const ul  = document.getElementById('contact-list');
  const sel = document.getElementById('chat-select');

  ul.innerHTML = '';
  Array.from(sel.querySelectorAll('option:not([value=""])')).forEach(o => sel.removeChild(o));

  // 1) Contacts
  const snap = await db.collection('users').doc(leaderUid)
    .collection('contacts').orderBy('createdAt','desc').get();

  snap.forEach(doc => {
    const email = doc.data().email;
    if (email === currentUser.email) return;

    const li = document.createElement('li');
    li.textContent = '👤 ' + email;
    li.addEventListener('click', () => {
      sel.value = email;
      sel.dispatchEvent(new Event('change'));
    });
    ul.appendChild(li);
    sel.appendChild(new Option('👤 ' + email, email));
  });

  // 2) Forums
  const forumsSnap = await db.collection('users').doc(leaderUid)
    .collection('forums').orderBy('createdAt','desc').get();

  forumsSnap.forEach(doc => {
    const name = doc.data().name;
    const fid  = doc.id;

    const li = document.createElement('li');
    li.textContent = '📢 ' + name;
    li.addEventListener('click', () => {
      sel.value = 'forum:' + fid;
      sel.dispatchEvent(new Event('change'));
    });
    ul.appendChild(li);
    sel.appendChild(new Option('📢 ' + name, 'forum:' + fid));
  });
}

// — Placeholder: load announcements (can be updated separately) —
async function loadAnnouncement() { /* implement or import as needed */ }
