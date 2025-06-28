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
    console.log("✅ Existing chat found:", q.docs[0].id);
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
    console.log(`📡 Snapshot for chat ${chatId}:`, snapshot.size, "messages");
    const msgs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log("  🧾 msg doc:", data);
      msgs.push({ id: doc.id, ...data });
    });
    callback(msgs);
  }, err => {
    console.error("❌ Listen error:", err);
  });

  return unsubscribe;
}

export function initChat(db, auth, leaderUid) {
  const contactList = document.getElementById('contact-list');
  const chatBox     = document.getElementById('chat-messages');
  const chatInput   = document.getElementById('chat-input');
  const sendBtn     = document.getElementById('send-message-btn');

  let currentUser    = null;
  let activeContact  = null;
  let activeChatId   = null;
  let replyToMessage = null;
  let unsubscribeSnap= null;

  auth.onAuthStateChanged(user => { currentUser = user; });

  // Click in the left UL
  contactList.addEventListener('click', async e => {
    if (e.target.tagName !== 'LI') return;
    contactList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');

    activeContact = e.target.textContent.replace('👤 ', '').trim();
    chatBox.innerHTML = '';
    unsubscribeSnap?.();

    activeChatId = await findOrCreateChat(db, leaderUid, currentUser.email, activeContact);

    unsubscribeSnap = startListeningToMessages(db, leaderUid, activeChatId, messages => {
      console.log("📨 Rendering", messages.length, "messages");
      chatBox.innerHTML = '';
      messages.forEach(m => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${m.sender === currentUser.email ? 'sent' : 'received'}`;
        bubble.textContent = m.text;
        chatBox.appendChild(bubble);
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });
  });

  // Send button
  sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text || !activeChatId) return;
    const payload = {
      text,
      sender: currentUser.email,
      toEmail: activeContact,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    console.log("✉️ Sending message:", payload);
    await db
      .collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages')
      .add(payload);
    chatInput.value = '';
  });
}
