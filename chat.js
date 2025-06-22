// chat.js — Modular one-to-one messaging logic with replies

export function initChat(db, auth, leaderUid) {
  const contactList  = document.getElementById('contact-list');
  const chatHeader   = document.getElementById('chat-header');
  const chatBox      = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('send-message-btn');

  let currentUser = auth.currentUser;
  let activeContact = null;
  let activeChatId = null;
  let replyToMessage = null;

  contactList.addEventListener('click', async e => {
    if (e.target.tagName !== 'LI') return;

    // highlight
    contactList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');

    activeContact = e.target.textContent.replace('👤 ', '').trim();
    chatHeader.textContent = `Chatting with ${activeContact}`;
    chatBox.innerHTML = '';

    activeChatId = await findOrCreateChat(currentUser.email, activeContact);
    loadMessagesFor(activeChatId, currentUser.email);
  });

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

    await db.collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages').add(messageData);

    chatInput.value = '';
    replyToMessage = null;
    clearReplyPreview();
    loadMessagesFor(activeChatId, currentUser.email);
  });

  async function findOrCreateChat(email1, email2) {
    const chatsRef = db.collection('users').doc(leaderUid).collection('chats');
    const snapshot = await chatsRef
      .where('participants', 'in', [
        [email1, email2],
        [email2, email1]
      ])
      .limit(1).get();

    if (!snapshot.empty) return snapshot.docs[0].id;

    // No chat exists — create one
    const docRef = await chatsRef.add({
      participants: [email1, email2],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  async function loadMessagesFor(chatId, currentEmail) {
    chatBox.innerHTML = '';

    const snapshot = await db.collection('users').doc(leaderUid)
      .collection('chats').doc(chatId)
      .collection('messages')
      .orderBy('timestamp')
      .get();

    snapshot.forEach(doc => {
      const m = doc.data();
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${m.fromEmail === currentEmail ? 'sent' : 'received'}`;

      let replyHTML = '';
      if (m.replyTo) {
        replyHTML = `
          <div class="reply-preview">
            <em>Replying to:</em> <div class="reply-text">${m.replyTo.text}</div>
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

    chatBox.scrollTop = chatBox.scrollHeight;

    // Attach reply button handlers
    document.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        replyToMessage = {
          id: btn.dataset.id,
          text: btn.dataset.text
        };
        showReplyPreview(replyToMessage.text);
      });
    });
  }

  function showReplyPreview(text) {
    let preview = document.getElementById('reply-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'reply-preview';
      preview.innerHTML = `
        <div class="preview-text"></div>
        <button id="cancel-reply">❌</button>
      `;
      chatInput.parentElement.insertBefore(preview, chatInput);
    }
    preview.querySelector('.preview-text').textContent = `Replying to: ${text}`;
    preview.style.display = 'block';
    document.getElementById('cancel-reply').onclick = () => {
      replyToMessage = null;
      clearReplyPreview();
    };
  }

  function clearReplyPreview() {
    const preview = document.getElementById('reply-preview');
    if (preview) {
      preview.remove();
    }
  }
} 
