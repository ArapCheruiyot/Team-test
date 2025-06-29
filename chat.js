// chat.js — Modular one-to-one messaging logic

/**
 * Finds an existing chat between email1 & email2, or creates it.
 * @returns {Promise<string>} the chat document ID
 */
export async function findOrCreateChat(db, leaderUid, email1, email2) {
  const chatsRef = db.collection('users').doc(leaderUid).collection('chats');
  // Look for either ordering of participants
  const snapshot = await chatsRef
    .where('participants', 'in', [
      [email1, email2],
      [email2, email1]
    ])
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }
  // Not found → create new
  const docRef = await chatsRef.add({
    participants: [email1, email2],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

/**
 * Subscribes to real-time updates of a chat’s messages.
 * @param {object} db Firestore instance
 * @param {string} leaderUid Firestore user doc ID
 * @param {string} chatId Chat document ID
 * @param {(messages:Array<Object>)=>void} callback invoked with an array of message objects
 * @returns {function()} unsubscribe function
 */
export function startListeningToMessages(db, leaderUid, chatId, callback) {
  const ref = db
    .collection('users').doc(leaderUid)
    .collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('timestamp');

  const unsubscribe = ref.onSnapshot(snapshot => {
    const msgs = [];
    snapshot.forEach(doc => {
      msgs.push({ id: doc.id, ...doc.data() });
    });
    callback(msgs);
  }, err => {
    console.error('Chat listener error:', err);
  });

  return unsubscribe;
}

/**
 * Initializes one-to-one chat UI.
 * - Hooks up <select id="chat-select"> change to swapping chats.
 * - Hooks up Send button & Enter key.
 * - Supports reply-to.
 */
export function initChat(db, auth, leaderUid) {
  const selectEl = document.getElementById('chat-select');
  const boxEl    = document.getElementById('chat-messages');
  const inputEl  = document.getElementById('chat-input');
  const sendBtn  = document.getElementById('send-message-btn');

  let currentUser    = null;
  let activeChatId   = null;
  let activeContact  = null;
  let replyToMessage = null;
  let unsubscribe    = null;

  // Keep currentUser in sync
  auth.onAuthStateChanged(u => {
    currentUser = u;
  });

  // 1) When dropdown changes → swap chat
  selectEl.addEventListener('change', async () => {
    const email = selectEl.value;
    boxEl.innerHTML = '';
    clearReplyPreview();
    if (unsubscribe) unsubscribe();

    if (!email) {
      activeChatId = null;
      activeContact = null;
      return;
    }

    activeContact = email;
    // Ensure chat doc exists
    activeChatId = await findOrCreateChat(
      db, leaderUid,
      currentUser.email,
      activeContact
    );

    // Real-time listen
    unsubscribe = startListeningToMessages(
      db, leaderUid, activeChatId,
      renderMessages
    );
  });

  // 2) Send-on-click
  sendBtn.addEventListener('click', sendMessage);
  // 3) Send-on-Enter (no shift)
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Render callback
  function renderMessages(messages) {
    boxEl.innerHTML = '';
    messages.forEach(m => {
      const b = document.createElement('div');
      b.className = `chat-bubble ${m.fromEmail === currentUser.email ? 'sent' : 'received'}`;

      // reply preview segment
      let replyHTML = '';
      if (m.replyTo) {
        replyHTML = `
          <div class="reply-preview">
            <em>Replying to:</em>
            <div class="reply-text">${m.replyTo.text}</div>
          </div>
        `;
      }

      b.innerHTML = `
        ${replyHTML}
        <strong>${m.fromEmail}:</strong> ${m.text}
        <button class="reply-btn" data-id="${m.id}" data-text="${m.text}">↩️</button>
      `;
      boxEl.appendChild(b);
    });
    boxEl.scrollTop = boxEl.scrollHeight;

    // attach reply handlers
    boxEl.querySelectorAll('.reply-btn').forEach(btn => {
      btn.onclick = () => {
        replyToMessage = {
          id: btn.dataset.id,
          text: btn.dataset.text
        };
        showReplyPreview(replyToMessage.text);
      };
    });
  }

  // Compose & send
  async function sendMessage() {
    const txt = inputEl.value.trim();
    if (!txt || !activeChatId || !activeContact) return;

    const msg = {
      text:     txt,
      fromEmail: currentUser.email,
      toEmail:   activeContact,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (replyToMessage) {
      msg.replyTo = { messageId: replyToMessage.id, text: replyToMessage.text };
    }

    await db
      .collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages')
      .add(msg);

    inputEl.value = '';
    replyToMessage = null;
    clearReplyPreview();
  }

  // UI for reply preview
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
    inputEl.parentElement.insertBefore(preview, inputEl);
    preview.querySelector('#cancel-reply').onclick = () => {
      replyToMessage = null;
      clearReplyPreview();
    };
  }
}
