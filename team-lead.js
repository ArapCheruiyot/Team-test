// team-lead.js — Dashboard logic (contacts, chat, announcements & forums)
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
    'add-contact-btn',
    'add-contact-form',
    'announcement-panel'
  ].forEach(function(id) {
    const el = document.getElementById(id);
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
      await db.collection('users').doc(leaderUid)
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

  // 4) Contact adding logic
  const addContactBtn = document.getElementById('add-contact-btn');
  const addContactForm = document.getElementById('add-contact-form');
  const saveContactBtn = document.getElementById('save-contact-btn');

  if (addContactBtn && addContactForm && saveContactBtn) {
    addContactBtn.addEventListener('click', () => {
      addContactForm.style.display = 'block';
    });

    saveContactBtn.addEventListener('click', async () => {
      const input = document.getElementById('new-contact-email');
      const email = input.value.trim();
      if (!email) return alert('Please enter a valid email');

      await db.collection('users').doc(leaderUid)
        .collection('contacts')
        .add({
          email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      input.value = '';
      addContactForm.style.display = 'none';
      await loadContactsAndForums();
    });
  }

  // 5) Chat header dropdown
  var hdr = document.getElementById('chat-header');
  var select = document.createElement('select');
  select.id = 'chat-select';
  select.className = 'chat-dropdown';
  select.innerHTML = '<option value="" selected>No conversation selected</option>';
  if (hdr && hdr.parentNode) {
    hdr.parentNode.replaceChild(select, hdr);
  }

  // 6) Handle dropdown changes (1:1 vs forum)
  select.addEventListener('change', async function() {
    var val = select.value;
    var box = document.getElementById('chat-messages');
    box.innerHTML = '';
    clearReplyPreview();
    if (unsubscribe) unsubscribe();

    if (!val) return;

    if (val.indexOf('forum:') === 0) {
      var forumId = val.split(':')[1];
      unsubscribe = startListeningToForumMessages(
        db, leaderUid, forumId, renderMessages
      );
    } else {
      var chatId = await findOrCreateChat(
        db, leaderUid, currentUser.email, val
      );
      unsubscribe = startListeningToMessages(
        db, leaderUid, chatId, renderMessages
      );
    }
  });

  // 7) Fallback “Send” button
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

  // 8) Auth guard & initial data load
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
  Array.from(sel.querySelectorAll('option:not([value=""])'))
    .forEach(o => sel.removeChild(o));

  // 1) contacts
  var snap = await db.collection('users').doc(leaderUid)
    .collection('contacts').orderBy('createdAt', 'desc').get();
  snap.forEach(doc => {
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
  snap = await db.collection('users').doc(leaderUid)
    .collection('forums').orderBy('createdAt', 'desc').get();
  snap.forEach(doc => {
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

// — Announcement & reply preview —
async function loadAnnouncement() {
  console.log("📣 loadAnnouncement() called");

  const doc = await db.collection('users').doc(leaderUid).get();
  const data = doc.data();
  console.log("📣 Loaded doc data:", data);

  const text = data?.announcement || '📣 No announcements yet.';
  document.getElementById('announcement-text-scroll').textContent = text;

  const postBtn = document.getElementById('post-announcement');
  const inputEl = document.getElementById('announcement-input');

  console.log("📣 postBtn:", postBtn, "inputEl:", inputEl, "isAgent:", isAgent);

  if (postBtn && inputEl && !isAgent) {
    console.log("📣 Setting post announcement listener");
    postBtn.addEventListener('click', async () => {
      const msg = inputEl.value.trim();
      console.log('[Post Clicked]', { msg });
      if (!msg) return alert('Announcement cannot be empty');

      try {
        await db.collection('users').doc(leaderUid).update({
          announcement: msg
        });
        inputEl.value = '';
        document.getElementById('announcement-text-scroll').textContent = msg;
        console.log('✅ Announcement posted:', msg);
      } catch (err) {
        console.error('❌ Firestore update failed:', err);
      }
    });
  } else {
    console.warn("❌ Could not attach post announcement listener");
  }
}


// Gear button toggles settings panel
document.getElementById('settings-btn')?.addEventListener('click', () => {
  const panel = document.getElementById('settings-panel');
  panel?.classList.toggle('controls-hidden');

  // Always hide inner sections when opening
  showSettingsSection(null);
});

// Tab switchers
document.getElementById('show-contact-settings')?.addEventListener('click', () => {
  showSettingsSection('contact-chat-controls');
});

document.getElementById('show-upload-section')?.addEventListener('click', () => {
  showSettingsSection('upload-section');
});

// Helper to show one section and hide others
function showSettingsSection(idToShow) {
  document.querySelectorAll('.settings-section').forEach(section => {
    section.style.display = section.id === idToShow ? 'block' : 'none';
  });
}


function clearReplyPreview()      { /* ... */ }
function showReplyPreview(text)   { /* ... */ }
