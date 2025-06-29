// team-lead.js — Dashboard logic (notes, contacts, announcements, and chat initialization)
import { initChat } from './chat.js';

// — Module-wide state & Firebase handles —
let currentUser = null;
let leaderUid   = null;

const db      = window.db;
const auth    = window.auth;
const isAgent = new URLSearchParams(window.location.search)
                  .get('asAgent') === 'true';

// Immediately hide agent-only controls
if (isAgent) {
  ['new-file','delete','add-contact-btn','add-contact-form','announcement-panel']
    .forEach(id => document.getElementById(id)?.style.setProperty('display','none'));
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  // 1) Gear button → toggle contacts pane
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

  // 3) Add Contact form show & save
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
          .add({
            email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        input.value = '';
        document.getElementById('add-contact-form').style.display = 'none';
        await loadContacts();
      } catch (e) {
        console.error('Failed to save contact:', e);
        alert('Failed to save contact.');
      }
    });

  // 4) Post Announcement
  document.getElementById('post-announcement')
    ?.addEventListener('click', async () => {
      const txt = document.getElementById('announcement-input').value.trim();
      if (!txt) return;
      try {
        await db.collection('users')
          .doc('A3HIWA6XWvhFcGdsM3o5IV0Qx3B2')
          .collection('announcement')
          .doc('latest')
          .set({
            text: txt,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        document.getElementById('announcement-input').value = '';
        alert('✅ Announcement posted!');
      } catch (e) {
        console.error('Failed to post announcement:', e);
        alert('Failed to post announcement.');
      }
    });

  // 5) Auth & initial data load
  auth.onAuthStateChanged(async user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = user;
    leaderUid   = isAgent
      ? 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2'
      : user.uid;

    document.getElementById('welcome').textContent =
      `Welcome, ${user.displayName||user.email}!` + (isAgent ? ' (Agent)' : '');

    // Load your panels
    await loadNotes();
    await loadContacts();
    await loadAnnouncement();

    // Kick off all chat logic (in chat.js)
    initChat(db, auth, leaderUid);
  });
});

// — Loaders & helpers —

// Announcements
async function loadAnnouncement() {
  try {
    const doc = await db
      .collection('users').doc(leaderUid)
      .collection('announcement').doc('latest')
      .get();
    if (doc.exists && isAgent) {
      document.getElementById('announcement-text-scroll').textContent =
        `📣 ${doc.data().text}`;
      document.getElementById('announcement-banner')
        .classList.remove('hide');
    }
  } catch (e) {
    console.error('Failed to load announcement:', e);
  }
}

// Notes
async function loadNotes() {
  const fileNames = document.getElementById('file-names');
  const textArea  = document.getElementById('text-input');
  fileNames.innerHTML = '';
  try {
    const snap = await db
      .collection('users').doc(leaderUid)
      .collection('notes')
      .orderBy('updatedAt','desc')
      .get();
    snap.forEach(doc => {
      const { title='', content='' } = doc.data();
      const div = document.createElement('div');
      div.className = 'note-item';
      div.textContent = title.trim() || '(Untitled)';
      div.onclick = () => {
        textArea.dataset.noteId = doc.id;
        textArea.value = content;
        textArea.focus();
      };
      fileNames.appendChild(div);
    });
  } catch (e) {
    console.error('Failed to load notes:', e);
  }
}

// Contacts
async function loadContacts() {
  const ul  = document.getElementById('contact-list');
  const sel = document.getElementById('chat-select');
  ul.innerHTML = '';
  sel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  const snap = await db
    .collection('users').doc(leaderUid)
    .collection('contacts').orderBy('createdAt','desc').get();

  snap.forEach(doc => {
    const { email } = doc.data();
    // skip your own email
    if (email === currentUser.email) return;

    // UL entry
    const li = document.createElement('li');
    li.textContent = `👤 ${email}`;
    li.onclick = () => {
      sel.value = email;
      sel.dispatchEvent(new Event('change'));
    };
    ul.appendChild(li);

    // SELECT option
    const opt = document.createElement('option');
    opt.value       = email;
    opt.textContent = email;
    sel.appendChild(opt);
  });
}

