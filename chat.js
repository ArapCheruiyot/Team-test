// chat.js — Modular one-to-one messaging logic

export async function findOrCreateChat(db, leaderUid, email1, email2) {
  const chatsRef = db.collection('users').doc(leaderUid).collection('chats');
  const q = await chatsRef
    .where('participants', 'in', [
      [email1, email2],
      [email2, email1]
    ])
    .limit(1)
    .get();

  if (!q.empty) {
    console.log("✅ Existing chat found");
    return q.docs[0].id;
  }

  const docRef = await chatsRef.add({
    participants: [email1, email2],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  console.log("🆕 New chat created:", docRef.id);
  return docRef.id;
}

export function startListeningToMessages(db, leaderUid, chatId, callback) {
  const ref = db
    .collection('users').doc(leaderUid)
    .collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('timestamp');

  const unsubscribe = ref.onSnapshot(snapshot => {
    console.log(`📡 Listening to chat (${chatId}), Messages: ${snapshot.size}`);
    const msgs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.text && data.timestamp) {
        msgs.push({ id: doc.id, ...data });
      } else {
        console.warn("⚠️ Skipped invalid message:", data);
      }
    });

    callback(msgs);
  }, err => {
    console.error("❌ Error in message listener:", err);
  });

  return unsubscribe;
}

export function initChat(db, auth, leaderUid) {
  const contactList = document.getElementById('contact-list');
  const chatBox     = document.getElementById('chat-messages');
  const chatInput   = document.getElementById('chat-input');
  const sendBtn     = document.getElementById('send-message-btn');

  let currentUser     = null;
  let activeContact   = null;
  let activeChatId    = null;
  let unsubscribeSnap = null;

  auth.onAuthStateChanged(user => {
    currentUser = user;
  });

  contactList?.addEventListener('click', async e => {
    if (e.target.tagName !== 'LI') return;

    contactList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');

    activeContact = e.target.textContent.replace('👤 ', '').trim();
    chatBox.innerHTML = '';

    unsubscribeSnap?.();

    activeChatId = await findOrCreateChat(db, leaderUid, currentUser.email, activeContact);

    unsubscribeSnap = startListeningToMessages(db, leaderUid, activeChatId, messages => {
      console.log("📨 Rendering messages:", messages.length);
      chatBox.innerHTML = '';

      messages.forEach(m => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${m.fromEmail === currentUser.email ? 'sent' : 'received'}`;
        bubble.textContent = m.text || '[No Text]';
        chatBox.appendChild(bubble);
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    });
  });

  sendBtn?.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text || !activeChatId || !currentUser || !activeContact) return;

    await db
      .collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages')
      .add({
        text,
        fromEmail: currentUser.email,
        toEmail: activeContact,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    chatInput.value = '';
  });
}
