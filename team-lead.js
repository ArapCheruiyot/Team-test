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
const isAgent = (new URLSearchParams(window.location.search)).get('asAgent') === 'true';

// Hide agent‐only controls immediately
if (isAgent) {
  [
    'new-file',
    'delete',
    'add-contact-btn',
    'add-contact-form',
    'announcement-panel'
  ].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  console.log("✅ team-lead.js initialized");

  // 1) Gear-button toggles contacts pane
  var settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      var pane = document.getElementById('contact-chat-controls');
      if (pane) pane.classList.toggle('controls-hidden');
    });
  }

  // 2) Offers Finder popup
  var offersBtn = document.getElementById('open-offers-btn');
  if (offersBtn) {
    offersBtn.addEventListener('click', function() {
      window.open(
        'https://arapcheruiyot.github.io/offer-search/',
        'offerSearch',
        'width=800,height=600'
      );
    });
  }

  // 3) “New Forum” flow
  var newForumBtn = document.getElementById('new-forum-btn');
  var newForumForm = document.getElementById('new-forum-form');
  var saveForumBtn = document.getElementById('save-forum-btn');
  if (newForumBtn && newForumForm && saveForumBtn) {
    newForumBtn.addEventListener('click', function() {
      newForumForm.style.display = 'block';
    });
    saveForumBtn.addEventListener('click', async function() {
      var nameEl = document.getElementById('forum-name');
      var name = nameEl.value.trim();
      if (!name) {
        alert('Enter a forum name');
        return;
      }
      await db
        .collection('users').doc(leaderUid)
        .collection('forums')
        .add({
          name: name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      nameEl.value = '';
      newForumForm.style.display = 'none';
      await loadContactsAndForums();
    });
  }

  // 4) Swap any X<h3 id="chat-header">X for our <select>
  var hdr = document.getElementById('chat-header');
  var select = document.createElement('select');
  select.id = 'chat-select';
  select.className = 'chat-dropdown';
  select.innerHTML = '<option value="" selected>No conversation selected</option>';
  if (hdr && hdr.parentNode) {
    hdr.parentNode.replaceChild(select, hdr);
  }

  // 5) Handle dropdown changes (1:1 vs forum)
  select.addEventListener('change', async function() {
    var val = select.value;
    var box = document.getElementById('chat-messages');
    box.innerHTML = '';
    clearReplyPreview();
    if (unsubscribe) unsubscribe();

    if (!val) return;

    if (val.indexOf('forum:') === 0) {
      // forum path
      var forumId = val.split(':')[1];
      unsubscribe = startListeningToForumMessages(
        db, leaderUid, forumId, renderMessages
      );
    } else {
      // one-to-one chat by email
      var chatId = await findOrCreateChat(
        db, leaderUid, currentUser.email, val
      );
      unsubscribe = startListeningToMessages(
        db, leaderUid, chatId, renderMessages
      );
    }
  });

  // 6) Fallback “Send” button
document.getElementById('send-message-btn')
  ?.addEventListener('click', async () => {
    const val = document.getElementById('chat-select').value;
    const txt = document.getElementById('chat-input').value.trim();
    if (!val || !txt) return;

    const payload = {
      text: txt,
      fromEmail: currentUser.email,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      replyTo: replyTo || null
    };

    if (val.startsWith('forum:')) {
      const fid = val.split(':')[1];
      await db.collection('users').doc(leaderUid)
        .collection('forums').doc(fid)
        .collection('messages')
        .add(payload);
    } else {
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
  auth.onAuthStateChanged(async function(u) {
    if (!u) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = u;
    leaderUid   = isAgent
      ? 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2'
      : u.uid;

    document.getElementById('welcome').textContent =
      'Welcome, ' + (u.displayName || u.email) + (isAgent ? ' (Agent)' : '');

    await loadNotes();
    await loadContactsAndForums();
    await loadAnnouncement();
    initChat(db, auth, leaderUid);
  });
});

// — Render callback (shared by chats & forums) —
function renderMessages(msgs) {
  var box = document.getElementById('chat-messages');
  box.innerHTML = '';
  msgs.forEach(function(m) {
    var b = document.createElement('div');
    b.className = 'chat-bubble ' +
      ((m.fromEmail === currentUser.email) ? 'sent' : 'received');
    b.textContent = m.text;
    box.appendChild(b);
  });
  box.scrollTop = box.scrollHeight;
}

// — Load contacts & forums into UL + dropdown —
async function loadContactsAndForums() {
  var ul  = document.getElementById('contact-list');
  var sel = document.getElementById('chat-select');
  ul.innerHTML = '';
  Array.prototype.slice.call(
    sel.querySelectorAll('option:not([value=""])')
  ).forEach(function(o) { sel.removeChild(o); });

  // 1) one-to-one contacts
  var snap = await db
    .collection('users').doc(leaderUid)
    .collection('contacts').orderBy('createdAt','desc')
    .get();
  snap.forEach(function(doc) {
    var email = doc.data().email;
    if (email === currentUser.email) return;
    var li = document.createElement('li');
    li.textContent = '👤 ' + email;
    li.addEventListener('click', function() {
      sel.value = email;
      sel.dispatchEvent(new Event('change'));
    });
    ul.appendChild(li);
    sel.appendChild(new Option('👤 ' + email, email));
  });

  // 2) forums
  snap = await db
    .collection('users').doc(leaderUid)
    .collection('forums').orderBy('createdAt','desc')
    .get();
  snap.forEach(function(doc) {
    var name = doc.data().name;
    var fid  = doc.id;
    var li = document.createElement('li');
    li.textContent = '📢 ' + name;
    li.addEventListener('click', function() {
      sel.value = 'forum:' + fid;
      sel.dispatchEvent(new Event('change'));
    });
    ul.appendChild(li);
    sel.appendChild(new Option('📢 ' + name, 'forum:' + fid));
  });
}

// — Announcement / Notes / Reply helpers (same as before) —
async function loadAnnouncement() { /* … */ }
async function loadNotes()        { /* … */ }
function clearReplyPreview()      { /* … */ }
function showReplyPreview(text)   { /* … */ }
