// team-lead.js — Dashboard logic (notes, contacts, chat, announcements)
import {
  initChat,
  findOrCreateChat,
  startListeningToMessages
} from './chat.js';

// — Module‐wide state & Firebase handles —
let currentUser     = null;
let leaderUid       = null;
let unsubscribeChat = null;
let replyToMessage  = null;

const db      = window.db;
const auth    = window.auth;
const isAgent = new URLSearchParams(window.location.search)
                  .get('asAgent') === 'true';

// Immediately hide agent‐only controls if needed
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

  // 3) Replace static header with <select>
  const headerElem = document.getElementById('chat-header');
  const chatSelect = document.createElement('select');
  chatSelect.id    = 'chat-select';
  chatSelect.classList.add('chat-dropdown');
  chatSelect.innerHTML = `<option value="" selected>No chat selected</option>`;
  if (headerElem) headerElem.replaceWith(chatSelect);

  // 4) When a contact is selected, findOrCreateChat → listen
  chatSelect.addEventListener('change', async () => {
    const email = chatSelect.value;
    const box   = document.getElementById('chat-messages');
    box.innerHTML = '';
    document.getElementById('reply-preview')?.remove();

    if (!email) {
      unsubscribeChat?.();
      return;
    }

    const chatId = await findOrCreateChat(db, leaderUid, currentUser.email, email);
    unsubscribeChat?.();

    unsubscribeChat = startListeningToMessages(db, leaderUid, chatId, (messages) => {
      box.innerHTML = '';
      messages.forEach(m => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${m.fromEmail === currentUser.email ? 'sent' : 'received'}`;

        let replyHTML = '';
        if (m.replyTo) {
          replyHTML = `
            <div class="reply-preview">
              <em>Replying to:</em>
              <div class="reply-text">${m.replyTo.text}</div>
            </div>
          `;
        }

        bubble.innerHTML = `
          ${replyHTML}
          <strong>${m.fromEmail}:</strong> ${m.text}
          <button class="reply-btn" data-id="${m.id}" data-text="${m.text}">↩️</button>
        `;
        box.appendChild(bubble);
      });

      box.scrollTop = box.scrollHeight;

      document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.onclick = () => {
          replyToMessage = {
            id: btn.dataset.id,
            text: btn.dataset.text
          };
          showReplyPreview(replyToMessage.text);
        };
      });
    });
  });

  // 5) Show “Add Contact” form & save new contact
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
        document.getElementById('add-contact-form').style.display = 'none';https://github.com/ArapCheruiyot/Teamhub/blob/main/team-lead.js
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
    leaderUid   = isAgent ? 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2' : user.uid;

    document.getElementById('welcome').textContent =
      `Welcome, ${user.displayName || user.email}!` + (isAgent ? ' (Agent)' : '');

    await loadNotes();
    await loadContacts();
    await loadAnnouncement();
    initChat(db, auth, leaderUid);
  });

  // 8) Send message button (fallback)
  document.getElementById('send-message-btn')
    ?.addEventListener('click', async () => {
      const sel   = document.getElementById('chat-select');
      const email = sel.value;
      const txt   = document.getElementById('chat-input').value.trim();
      if (!email || !txt) return;

      const chatId = await findOrCreateChat(db, leaderUid, currentUser.email, email);
      const messageData = {
        text: txt,
        fromEmail: currentUser.email,
        toEmail: email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (replyToMessage) {
        messageData.replyTo = {
          messageId: replyToMessage.id,
          text: replyToMessage.text
        };
      }

      await db.collection('users').doc(leaderUid)
        .collection('chats').doc(chatId)
        .collection('messages').add(messageData);

      document.getElementById('chat-input').value = '';
      replyToMessage = null;
      clearReplyPreview();
    });
});

// — Reply Preview Helpers —
function clearReplyPreview() {
  document.getElementById('reply-preview')?.remove();
}
function showReplyPreview(text) {
  clearReplyPreview();
  const preview = document.createElement('div');
  preview.id = 'reply-preview';
  preview.innerHTML = `
    <span>Replying to: ${text}</span>
    <button id="cancel-reply">❌</button>
  `;
  const input = document.getElementById('chat-input');
  input.parentElement.insertBefore(preview, input);
  preview.querySelector('#cancel-reply').onclick = () => {
    replyToMessage = null;
    clearReplyPreview();
  };
}

// — Loaders & helpers —
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

async function loadContacts() {
  const ul  = document.getElementById('contact-list');
  const sel = document.getElementById('chat-select');
  ul.innerHTML = '';
  sel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  try {
    const snap = await db.collection('users').doc(leaderUid)
      .collection('contacts').orderBy('createdAt','desc').get();
    snap.forEach(doc => {
      const { email } = doc.data();
      const li = document.createElement('li');
      li.textContent = `👤 ${email}`;
      li.onclick = () => {
        sel.value = email;
        sel.dispatchEvent(new Event('change'));
      };
      ul.appendChild(li);

      const opt = document.createElement('option');
      opt.value       = email;
      opt.textContent = email;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to load contacts:', e);
  }
}
