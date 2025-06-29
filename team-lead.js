// team-lead.js — Dashboard logic (notes, contacts, chat, announcements & forums)
import {
  initChat,
  findOrCreateChat,
  startListeningToMessages,
  startListeningToForumMessages
} from './chat.js';

// — State & Firebase handles —
let currentUser = null;
let leaderUid   = null;
let unsubscribe = null;
let replyTo     = null;

const db      = window.db;
const auth    = window.auth;
const isAgent = new URLSearchParams(location.search).get('asAgent') === 'true';

// Hide agent-only bits immediately
if (isAgent) {
  ['new-file','delete','add-contact-btn','add-contact-form','announcement-panel']
    .forEach(id => document.getElementById(id)?.style.display = 'none');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  // — Gear toggle contacts pane
  document.getElementById('settings-btn')
    ?.addEventListener('click', () =>
      document.getElementById('contact-chat-controls')
        .classList.toggle('controls-hidden')
    );

  // — Offers finder
  document.getElementById('open-offers-btn')
    ?.addEventListener('click', () =>
      window.open(
        'https://arapcheruiyot.github.io/offer-search/',
        'offerSearch',
        'width=800,height=600'
      )
    );

  // — New Forum button
  document.getElementById('new-forum-btn')
    ?.addEventListener('click', () =>
      document.getElementById('new-forum-form').style.display = 'block'
    );
  document.getElementById('save-forum-btn')
    ?.addEventListener('click', async () => {
      const name = document.getElementById('forum-name').value.trim();
      if (!name) return alert('Enter a forum name');
      await db.collection('users').doc(leaderUid)
        .collection('forums')
        .add({ name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      document.getElementById('forum-name').value = '';
      document.getElementById('new-forum-form').style.display = 'none';
      await loadContactsAndForums();
    });

  // — Replace chat-header with dropdown
  const hdr = document.getElementById('chat-header');
  const select = document.createElement('select');
  select.id = 'chat-select';
  select.classList.add('chat-dropdown');
  select.innerHTML = `<option value="" selected>No chat selected</option>`;
  if (hdr) hdr.replaceWith(select);

  // — On select change: either one-to-one or forum
  select.addEventListener('change', async () => {
    const val = select.value;
    const box = document.getElementById('chat-messages');
    box.innerHTML = '';
    clearReplyPreview();
    unsubscribe?.();

    if (!val) return;

    if (val.startsWith('forum:')) {
      // forum path
      const forumId = val.split(':')[1];
      unsubscribe = startListeningToForumMessages(
        db, leaderUid, forumId, renderMessages
      );
    } else {
      // 1:1 chat path
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

  // — Fallback send button
  document.getElementById('send-message-btn')
    ?.addEventListener('click', async () => {
      const sel  = document.getElementById('chat-select');
      const val  = sel.value;
      const txt  = document.getElementById('chat-input').value.trim();
      if (!val || !txt) return;

      const payload = {
        text:   txt,
        from:   currentUser.email,
        ts:     firebase.firestore.FieldValue.serverTimestamp(),
        replyTo
      };

      if (val.startsWith('forum:')) {
        const forumId = val.split(':')[1];
        await db.collection('users').doc(leaderUid)
          .collection('forums').doc(forumId)
          .collection('messages').add(payload);
      } else {
        const chatId = await findOrCreateChat(
          db, leaderUid,
          currentUser.email,
          val
        );
        await db.collection('users').doc(leaderUid)
          .collection('chats').doc(chatId)
          .collection('messages').add({
            ...payload,
            to: val
          });
      }

      document.getElementById('chat-input').value = '';
      replyTo = null;
      clearReplyPreview();
    });

  // — Auth & initial load
  auth.onAuthStateChanged(async u => {
    if (!u) return location.href = 'index.html';
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

// — Render callback for both chats & forums
function renderMessages(msgs) {
  const box = document.getElementById('chat-messages');
  box.innerHTML = '';
  msgs.forEach(m => {
    const b = document.createElement('div');
    b.className = `chat-bubble ${m.from === currentUser.email ? 'sent' : 'received'}`;
    b.textContent = m.text;
    box.appendChild(b);
  });
  box.scrollTop = box.scrollHeight;
}

// — Load contacts + forums into both UL & dropdown
async function loadContactsAndForums() {
  const ul  = document.getElementById('contact-list');
  const sel = document.getElementById('chat-select');
  ul.innerHTML = '';
  sel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  // 1) personal contacts
  let snap = await db.collection('users').doc(leaderUid)
    .collection('contacts').orderBy('createdAt','desc').get();
  snap.forEach(doc => {
    const { email } = doc.data();
    if (email === currentUser.email) return;
    const li = document.createElement('li');
    li.textContent = `👤 ${email}`;
    li.onclick = () => {
      sel.value = email; sel.dispatchEvent(new Event('change'));
    };
    ul.appendChild(li);
    const opt = new Option(email, email);
    sel.appendChild(opt);
  });

  // 2) forums
  snap = await db.collection('users').doc(leaderUid)
    .collection('forums').orderBy('createdAt','desc').get();
  snap.forEach(doc => {
    const name = doc.data().name;
    const id   = doc.id;
    const li = document.createElement('li');
    li.textContent = `📢 ${name}`;
    li.onclick = () => {
      sel.value = `forum:${id}`; sel.dispatchEvent(new Event('change'));
    };
    ul.appendChild(li);
    const opt = new Option(`📢 ${name}`, `forum:${id}`);
    sel.appendChild(opt);
  });
}

// — The rest: announcements, notes, reply helpers…
function clearReplyPreview() { /*…*/ }
function showReplyPreview(text) { /*…*/ }
async function loadAnnouncement() { /*…*/ }
async function loadNotes() { /*…*/ }
