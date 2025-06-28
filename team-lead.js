// team-lead.js — Dashboard logic (notes, contacts, chat, announcements)
import { initChat, findOrCreateChat, startListeningToMessages } from './chat.js';

// — Module-wide state & Firebase handles —
let currentUser     = null;
let leaderUid       = null;
let unsubscribeChat = null;

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

  // 1) Gear button toggles contact pane
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

  // 3) Swap out static header for a <select>
  const headerElem = document.getElementById('chat-header');
  const chatSelect = document.createElement('select');
  chatSelect.id    = 'chat-select';
  chatSelect.classList.add('chat-dropdown');
  chatSelect.innerHTML = `<option value="" selected>No chat selected</option>`;
  if (headerElem) headerElem.replaceWith(chatSelect);

  // 4) When a contact is selected, find/create the chat and listen
  chatSelect.addEventListener('change', async () => {
    const selectedEmail = chatSelect.value;
    if (!selectedEmail) {
      document.getElementById('chat-messages').innerHTML = '';
      return;
    }
    // Find or create the chat between currentUser.email and selectedEmail
    const chatId = await findOrCreateChat(db, leaderUid, currentUser.email, selectedEmail);
    // Unsubscribe previous listener, subscribe to new
    if (unsubscribeChat) unsubscribeChat();
    unsubscribeChat = startListeningToMessages(db, leaderUid, chatId, messages => {
      const box = document.getElementById('chat-messages');
      box.innerHTML = '';
      messages.forEach(m => {
        const b = document.createElement('div');
        b.className = `chat-bubble ${(m.sender === currentUser.email) ? 'sent' : 'received'}`;
        b.textContent = m.text;
        box.appendChild(b);
      });
      box.scrollTop = box.scrollHeight;
    });
  });

  // 5) Show & save new contacts
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
        console.error(e);
        alert('Failed to save contact.');
      }
    });

  // 6) Post announcements
  document.getElementById('post-announcement')
    ?.addEventListener('click', async () => {
      const txt = document.getElementById('announcement-input').value.trim();
      if (!txt) return;
      try {
        await db.collection('users').doc('A3HIWA6XWvhFcGdsM3o5IV0Qx3B2')
          .collection('announcement').doc('latest')
          .set({
            text: txt,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        document.getElementById('announcement-input').value = '';
        alert('✅ Announcement posted!');
      } catch (e) {
        console.error(e);
        alert('Failed to post announcement.');
      }
    });

  // 7) Auth guard & initial data load
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

    await loadNotes();
    await loadContacts();
    await loadAnnouncement();
    initChat(db, auth, leaderUid);
  });

  // 8) Send a new message
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
  } catch (e) {
    console.error(e);
  }
}

// Notes
async function loadNotes() {
  const fileNames = document.getElementById('file-names');
  const textArea  = document.getElementById('text-input');
  fileNames.innerHTML = '';
  try {
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
  } catch (e) {
    console.error('Error loading notes:', e);
  }
}

// Contacts → populates both UL and the SELECT by **email**
async function loadContacts() {
  const ul  = document.getElementById('contact-list');
  const sel = document.getElementById('chat-select');
  ul.innerHTML  = '';
  sel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  try {
    const snap = await db.collection('users').doc(leaderUid)
      .collection('contacts').orderBy('createdAt','desc').get();
    snap.forEach(doc => {
      const { email } = doc.data();

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
  } catch (e) {
    console.error('Failed to load contacts:', e);
  }
}
