// chat.js — Messaging logic with Cloudinary file upload support

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

export function initChat(db, auth, leaderUid) {
  const selectEl = document.getElementById('chat-select');
  const boxEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-input');
  const fileInput = document.getElementById('chat-file-input');
  const sendBtn = document.getElementById('send-message-btn');

  let currentUser = null;
  let activeChatId = null;
  let activeContact = null;
  let replyToMessage = null;
  let unsubscribe = null;
  let selectedFile = null;

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

  // Delay Cloudinary upload until Send is clicked
  fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const preview = document.getElementById('selected-file-preview');
    if (preview) preview.remove();

    const placeholder = document.createElement('div');
    placeholder.id = 'selected-file-preview';
    placeholder.innerHTML = `
      📎 Selected: ${selectedFile.name} <button id="clear-selected-file">❌</button>
    `;
    inputEl.parentElement.insertBefore(placeholder, inputEl);

    document.getElementById('clear-selected-file').onclick = () => {
      selectedFile = null;
      placeholder.remove();
      fileInput.value = '';
    };
  });

  async function sendTextMessage() {
  const text = inputEl.value.trim();
  const val = selectEl.value;
  if (!text && !selectedFile) return;

  let fileURL = null;
  let fileName = null;
  let fileType = null;

  if (selectedFile) {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('upload_preset', 'unsigned_chat');
    formData.append('folder', 'team-hub image chats');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/decckqobb/image/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Upload failed');

      fileURL = data.secure_url;
      fileName = selectedFile.name;
      fileType = selectedFile.type;
    } catch (err) {
      alert("Image upload failed: " + err.message);
      return;
    }
  }

  const payload = {
    fromEmail: currentUser.email,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (text) payload.text = text;
  if (fileURL) {
    payload.fileUrl = fileURL;
    payload.fileName = fileName;
    payload.fileType = fileType;
  }

  if (replyToMessage) {
    payload.replyTo = {
      messageId: replyToMessage.id,
      text: replyToMessage.text
    };
  }

  if (val.startsWith('forum:')) {
    await db.collection('forums').doc(val.split(':')[1])
      .collection('messages').add(payload);
  } else {
    const chatId = activeChatId || await findOrCreateChat(db, leaderUid, currentUser.email, val);
    await db.collection('users').doc(leaderUid)
      .collection('chats').doc(chatId)
      .collection('messages').add({ ...payload, toEmail: val });
  }

  inputEl.value = '';
  selectedFile = null;
  fileInput.value = '';
  document.getElementById('selected-file-preview')?.remove();
  replyToMessage = null;
  clearReplyPreview();
}


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
