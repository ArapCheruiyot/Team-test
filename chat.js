// chat.js — Messaging logic with Cloudinary file upload support

// 🔹 Finds or creates a one-to-one chat
export async function findOrCreateChat(db, leaderUid, email1, email2) {
  const chatsRef = db.collection('users').doc(leaderUid).collection('chats');
  const snapshot = await chatsRef
    .where('participants', 'in', [
      [email1, email2],
      [email2, email1]
    ])
    .limit(1)
    .get();

  if (!snapshot.empty) return snapshot.docs[0].id;

  const docRef = await chatsRef.add({
    participants: [email1, email2],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return docRef.id;
}

// 🔹 Listens for 1-on-1 messages
export function startListeningToMessages(db, leaderUid, chatId, callback) {
  return db.collection('users').doc(leaderUid)
    .collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('timestamp')
    .onSnapshot(snapshot => {
      const msgs = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      callback(msgs);
    });
}

// 🔹 Listens to forum messages
export function startListeningToForumMessages(db, _leaderUid, forumId, callback) {
  return db.collection('forums').doc(forumId)
    .collection('messages')
    .orderBy('timestamp')
    .onSnapshot(snapshot => {
      const msgs = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      callback(msgs);
    });
}

// 🔹 Initializes chat
export function initChat(db, auth, leaderUid) {
  const selectEl = document.getElementById('chat-select');
  const boxEl    = document.getElementById('chat-messages');
  const inputEl  = document.getElementById('chat-input');
  const fileInput = document.getElementById('chat-file-input');
  const sendBtn  = document.getElementById('send-message-btn');

  let currentUser = null;
  let activeChatId = null;
  let activeContact = null;
  let replyToMessage = null;
  let unsubscribe = null;

  auth.onAuthStateChanged(u => { currentUser = u; });

  selectEl.addEventListener('change', async () => {
    const val = selectEl.value;
    boxEl.innerHTML = '';
    clearReplyPreview();
    unsubscribe?.();

    if (!val) return;

    if (val.startsWith('forum:')) {
      const forumId = val.split(':')[1];
      unsubscribe = startListeningToForumMessages(db, leaderUid, forumId, renderMessages);
    } else {
      activeContact = val;
      activeChatId = await findOrCreateChat(db, leaderUid, currentUser.email, val);
      unsubscribe = startListeningToMessages(db, leaderUid, activeChatId, renderMessages);
    }
  });

  sendBtn.addEventListener('click', sendTextMessage);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  });

  // 🔄 Cloudinary file upload
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !selectEl.value) return;

    const placeholder = document.createElement('div');
    placeholder.textContent = `📤 Uploading ${file.name}...`;
    boxEl.appendChild(placeholder);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'unsigned_chat'); // <- your Cloudinary unsigned preset name
      formData.append('folder', 'team-hub image chats'); // <- your Cloudinary folder

      const res = await fetch('https://api.cloudinary.com/v1_1/decckqobb/auto/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      const fileURL = data.secure_url;

      const payload = {
        fileUrl: fileURL,
        fileName: file.name,
        fileType: file.type,
        fromEmail: currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (replyToMessage) {
        payload.replyTo = {
          messageId: replyToMessage.id,
          text: replyToMessage.text
        };
      }

      const val = selectEl.value;
      if (val.startsWith('forum:')) {
        await db.collection('forums').doc(val.split(':')[1])
          .collection('messages').add(payload);
      } else {
        const chatId = activeChatId || await findOrCreateChat(db, leaderUid, currentUser.email, val);
        await db.collection('users').doc(leaderUid)
          .collection('chats').doc(chatId)
          .collection('messages').add({ ...payload, toEmail: val });
      }

      replyToMessage = null;
      clearReplyPreview();
      fileInput.value = '';
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      placeholder.remove();
    }
  });

  function renderMessages(messages) {
    boxEl.innerHTML = '';
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

      let content = '';

      if (m.text) {
        content = `<strong>${m.fromEmail}:</strong> ${m.text}`;
      } else if (m.fileUrl) {
        const isImage = m.fileType?.startsWith('image/');
        content = isImage
          ? `<strong>${m.fromEmail}:</strong><br><img src="${m.fileUrl}" alt="Image" style="max-width: 200px; border-radius: 4px;" />`
          : `<strong>${m.fromEmail}:</strong><br><a href="${m.fileUrl}" target="_blank">${m.fileName || 'Download File'}</a>`;
      }

      bubble.innerHTML = `
        ${replyHTML}
        ${content}
        <button class="reply-btn" data-id="${m.id}" data-text="${m.text || m.fileName || 'File'}">↩️</button>
      `;
      boxEl.appendChild(bubble);
    });
    boxEl.scrollTop = boxEl.scrollHeight;

    boxEl.querySelectorAll('.reply-btn').forEach(btn => {
      btn.onclick = () => {
        replyToMessage = { id: btn.dataset.id, text: btn.dataset.text };
        showReplyPreview(replyToMessage.text);
      };
    });
  }

  async function sendTextMessage() {
    const text = inputEl.value.trim();
    const val = selectEl.value;
    if (!text || !val) return;

    const payload = {
      text,
      fromEmail: currentUser.email,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (replyToMessage) {
      payload.replyTo = {
        messageId: replyToMessage.id,
        text: replyToMessage.text
      };
    }

    if (val.startsWith('forum:')) {
      const forumId = val.split(':')[1];
      await db.collection('forums').doc(forumId)
        .collection('messages').add(payload);
    } else {
      const chatId = activeChatId || await findOrCreateChat(db, leaderUid, currentUser.email, val);
      await db.collection('users').doc(leaderUid)
        .collection('chats').doc(chatId)
        .collection('messages').add({
          ...payload,
          toEmail: val
        });
    }

    inputEl.value = '';
    replyToMessage = null;
    clearReplyPreview();
  }

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
