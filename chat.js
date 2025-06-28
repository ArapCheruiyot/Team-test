// chat.js — Modular one-to-one messaging logic

/**
 * Finds an existing chat between email1 & email2, or creates it.
 * @returns {Promise<string>} chat document ID
 */
export async function findOrCreateChat(db, leaderUid, email1, email2) {
  const chatsRef = db.collection('users').doc(leaderUid).collection('chats');
  // Look for either ordering of participants
  const q = await chatsRef
    .where('participants', 'in', [[email1, email2], [email2, email1]])
    .limit(1)
    .get();
  if (!q.empty) {
    return q.docs[0].id;
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
 * @param {(messages:Array<Object>)=>void} callback receives array of {id, sender, text, timestamp, ...}
 * @returns {function()} unsubscribe function
 */
export function startListeningToMessages(db, leaderUid, chatId, callback) {
  const ref = db
    .collection('users')
    .doc(leaderUid)
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp');
  const unsubscribe = ref.onSnapshot(snapshot => {
    const msgs = [];
    snapshot.forEach(doc => {
      msgs.push({ id: doc.id, ...doc.data() });
    });
    callback(msgs);
  });
  return unsubscribe;
}

/**
 * Your original initChat — left unchanged.
 * (If you’d rather collapse everything into team-lead.js you can remove this.)
 */
export function initChat(db, auth, leaderUid) {
  const contactList  = document.getElementById('contact-list');
  const chatBox      = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('send-message-btn');

  let currentUser    = null;
  let activeContact  = null;
  let activeChatId   = null;
  let replyToMessage = null;
  let unsubscribeSnap= null;

  auth.onAuthStateChanged(user => {
    currentUser = user;
  });

  // Click-to-chat (legacy)
  contactList.addEventListener('click', async e => {
    if (e.target.tagName !== 'LI') return;
    // Highlight
    contactList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');

    activeContact = e.target.textContent.replace('👤 ', '').trim();
    chatBox.innerHTML = '';

    // Unsubscribe old
    unsubscribeSnap?.();

    // Find or create
    activeChatId = await findOrCreateChat(db, leaderUid, currentUser.email, activeContact);

    // Listen
    unsubscribeSnap = startListeningToMessages(db, leaderUid, activeChatId, messages => {
      chatBox.innerHTML = '';
      messages.forEach(m => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${m.fromEmail === currentUser.email ? 'sent' : 'received'}`;
        // reply preview block
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
        chatBox.appendChild(bubble);
      });
      chatBox.scrollTop = chatBox.scrollHeight;

      // Attach reply handlers
      document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.onclick = () => {
          replyToMessage = { id: btn.dataset.id, text: btn.dataset.text };
          showReplyPreview(replyToMessage.text);
        };
      });
    });
  });

  // Send
  sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text || !activeChatId) return;
    const messageData = {
      text,
      fromEmail: currentUser.email,
      toEmail: activeContact,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (replyToMessage) {
      messageData.replyTo = { messageId: replyToMessage.id, text: replyToMessage.text };
    }
    await db
      .collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages')
      .add(messageData);

    chatInput.value = '';
    replyToMessage = null;
    clearReplyPreview();
  });

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
    chatInput.parentElement.insertBefore(preview, chatInput);
    preview.querySelector('#cancel-reply').onclick = () => {
      replyToMessage = null;
      clearReplyPreview();
    };
  }
}
