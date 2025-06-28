// chat.js — Modular one-to-one messaging logic with replies
export function initChat(db, auth, leaderUid) {
  const chatSelect   = document.getElementById('chat-select');
  const chatBox      = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('send-message-btn');

  let currentUser   = null;
  let activeContact = null;
  let activeChatId  = null;
  let replyToMessage = null;
  let unsubscribeSnap = null;

  auth.onAuthStateChanged(user => {
    currentUser = user;
  });

  // 1) When dropdown changes, find/create chat and load messages
  chatSelect.addEventListener('change', async () => {
    const contactEmail = chatSelect.options[chatSelect.selectedIndex].text;
    activeContact = contactEmail;

    // clear preview & messages
    clearReplyPreview();
    chatBox.innerHTML = '';

    if (unsubscribeSnap) {
      unsubscribeSnap(); // detach old listener
      unsubscribeSnap = null;
    }

    const chatId = chatSelect.value;
    if (!chatId) {
      // placeholder “No chat selected”
      return;
    }
    activeChatId = chatId;

    // real‐time listener on messages subcollection
    unsubscribeSnap = db
      .collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages')
      .orderBy('timestamp')
      .onSnapshot(snap => {
        chatBox.innerHTML = '';
        snap.forEach(doc => {
          const m = doc.data();
          const bubble = document.createElement('div');
          bubble.className =
            `chat-bubble ${m.fromEmail === currentUser.email ? 'sent' : 'received'}`;

          // reply preview
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
            <button class="reply-btn" data-id="${doc.id}" data-text="${m.text}">↩️</button>
          `;
          chatBox.appendChild(bubble);
        });

        // scroll down
        chatBox.scrollTop = chatBox.scrollHeight;

        // attach reply handlers
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

  // 2) Sending a message
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
      messageData.replyTo = {
        messageId: replyToMessage.id,
        text: replyToMessage.text
      };
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

  // 3) Helper to cancel reply preview
  function clearReplyPreview() {
    const prev = document.getElementById('reply-preview');
    if (prev) prev.remove();
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
