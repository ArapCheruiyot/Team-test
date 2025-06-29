// team-lead.js — Dashboard logic (notes, contacts, chat, announcements & forums)
import {
  initChat,
  findOrCreateChat,
  startListeningToMessages,
  startListeningToForumMessages
} from './chat.js';

// — App state & Firebase handles —
let currentUser = null;
let leaderUid   = null;
let unsubscribe = null;
let replyTo     = null;

const db      = window.db;
const auth    = window.auth;
const isAgent = new URLSearchParams(window.location.search).get('asAgent') === 'true';

// Hide agent-only controls immediately
if (isAgent) {
  [
    'new-file','delete',
    'add-contact-btn','add-contact-form',
    'announcement-panel'
  ].forEach(id => document.getElementById(id)?.style.setProperty('display','none'));
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  // 1) Settings-gear toggles contacts pane
  document.getElementById('settings-btn')
    ?.addEventListener('click', () =>
      document.getElementById('contact-chat-controls')
        .classList.toggle('controls-hidden')
    );

  // 2) Offers Finder popup
  document.getElementById('open-offers-btn')
    ?.addEventListener('click', () =>
      window.open(
        'https://arapcheruiyot.github.io/offer-search/',
        'offerSearch',
        'width=800,height=600'
      )
    );

  // 3) “New Forum” flow
  document.getElementById('new-forum-btn')
    ?.addEventListener('click', () =>
      document.getElementById('new-forum-form').style.setProperty('display','block')
    );
  document.getElementById('save-forum-btn')
    ?.addEventListener('click', async () => {
      const name = document.getElementById('forum-name').value.trim();
      if (!name) return alert('Enter a forum name');
      await db.collection('users').doc(leaderUid)
        .collection('forums')
        .add({ name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      document.getElementById('forum-name').value = '';
      document.getElementById('new-forum-form').style.setProperty('display','none');
      await loadContactsAndForums();
    });

  // 4) Swap out any static <h3 id="chat-header"> for our <select>
  const hdr = document.getElementById('chat-header');
  const select = document.createElement('select');
  select.id    = 'chat-select';
  select.classList.add('chat-dropdown');
  select.innerHTML = `<option value="" selected>No conversation selected</option>`;
  if (hdr) hdr.replaceWith(select);

  // 5) When user picks from dropdown, either hook into a forum or a 1:1 chat
  select.addEventListener('change', async () => {
    const val = select.value;
    const box = document.getElementById('chat-messages');
    box.innerHTML = '';
    clearReplyPreview();
    if (unsubscribe) unsubscribe();

    if (!val) return;

    // Forum IDs are prefixed: "forum:<docId>"
    if (val.startsWith('forum:')) {
      const forumId = val.split(':')[1];
      unsubscribe = startListeningToForumMessages(
        db, leaderUid, forumId, renderMessages
      );
    } else {
      // 1:1 chat by email
      const chatId = await findOrCreateChat(
        db, leaderUid,
        currentUser.email,
        val
      );
      unsubscribe = startListeningToMessages(
        db, leaderUid, chatId, renderMessages
      );
    }
  });

  // 6) Fallback “Send” button (in case initChat wiring isn’t used)
  document.getElementById('send-message-btn')
    ?.addEventListener('click', async () => {
      const val = document.getElementById('chat-select').value;
      const txt = document.getElementById('chat-input').value.trim();
      if (!val || !txt) return;

      // Common payload
      const payload = {
        text: txt,
        fromEmail: currentUser.email,
        ts: firebase.firestore.FieldValue.serverTimestamp(),
        replyTo
      };

      if (val.startsWith('forum:')) {
        // Post to forum
        const fid = val.split(':')[1];
        await db.collection('users').doc(leaderUid)
          .collection('forums').doc(fid)
          .collection('messages')
          .add(payload);
      } else {
        // Post to 1:1 chat
        const chatId = await findOrCreateChat(
          db, leaderUid,
          currentUser.email,
          val
        );
        await db.collection('users').doc(leaderUid)
          .collection('chats').doc(chatId)
          .collection('messages')
          .add({ ...payload, toEmail: val });
      }

      document.getElementById('chat-input').value = '';
      replyTo = null;
      clearReplyPreview();
    });

  // 7) Auth guard & initial data load
  auth.onAuthStateChanged(async u => {
    if (!u) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = u;
    leaderUid   = isAgent
      ? 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2'
      : u.uid;

    document.getElementById('welcome').textContent =
      `Welcome, ${u.displayName || u.email}!` + (isAgent ? ' (Agent)' : '');

    await loadNotes();
    await loadContactsAndForums();
    await loadAnnouncement();
    initChat(db, auth, leaderUid);
  });
});

// — Render callback (shared by chats & forums) —
function renderMessages(msgs) {
  const box = document.getElementById('chat-messages');
  box.innerHTML = '';
  msgs.forEach(m => {
    const b = document.createElement('div');
    b.className = `chat-bubble ${(m.fromEmail === currentUser.email) ? 'sent' : 'received'}`;
    b.textContent = m.text;
    box.appendChild(b);
  });
  box.scrollTop = box.scrollHeight;
}

// — Load contacts & forums into the UL and dropdown —
async function loadContactsAndForums() {
  const ul  = document.getElementById('contact-list');
  const sel = document.getElementById('chat-select');
  ul.innerHTML = '';
  sel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  // 1) One-to-one contacts
  let snap = await db.collection('users').doc(leaderUid)
    .collection('contacts').orderBy('createdAt','desc').get();
  snap.forEach(doc => {
    const { email } = doc.data();
    if (email === currentUser.email) return;
    const li = document.createElement('li');
    li.textContent = `👤 ${email}`;
    li.onclick = () => {
      sel.value = email;
      sel.dispatchEvent(new Event('change'));
    };
    ul.appendChild(li);
    sel.appendChild(new Option(`👤 ${email}`, email));
  });

  // 2) Forums
  snap = await db.collection('users').doc(leaderUid)
    .collection('forums').orderBy('createdAt','desc').get();
  snap.forEach(doc => {
    const { name } = doc.data();
    const fid = doc.id;
    const li = document.createElement('li');
    li.textContent = `📢 ${name}`;
    li.onclick = () => {
      sel.value = `forum:${fid}`;
      sel.dispatchEvent(new Event('change'));
    };
    ul.appendChild(li);
    sel.appendChild(new Option(`📢 ${name}`, `forum:${fid}`));
  });
}

// — Announcements, notes & reply preview helpers (left as before) —
async function loadAnnouncement() { /* … */ }
async function loadNotes()        { /* … */ }
function clearReplyPreview()      { /* … */ }
function showReplyPreview(text)   { /* … */ }
