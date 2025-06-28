// chat.js — Modular one-to-one messaging logic

/**
 * Finds or creates a chat between two emails.
 * Returns the chat document ID.
 */
export async function findOrCreateChat(db, leaderUid, email1, email2) {
  const chatsRef = db.collection('users')
                     .doc(leaderUid)
                     .collection('chats');
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

  const newDoc = await chatsRef.add({
    participants: [email1, email2],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  console.log("🆕 New chat created:", newDoc.id);
  return newDoc.id;
}

/**
 * Listens for real-time message updates in a chat.
 * Calls callback with an array of { id, text, sender, timestamp, replyTo }.
 */
export function startListeningToMessages(db, leaderUid, chatId, callback) {
  const ref = db
    .collection('users').doc(leaderUid)
    .collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('timestamp');

  const unsubscribe = ref.onSnapshot(snapshot => {
    console.log(`📡 Got ${snapshot.size} messages for chat ${chatId}`);
    const msgs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      msgs.push({
        id:        doc.id,
        text:      data.text,
        sender:    data.sender,        // unified field
        timestamp: data.timestamp,
        replyTo:   data.replyTo || null
      });
    });
    callback(msgs);
  }, err => {
    console.error("❌ Message listener error:", err);
  });

  return unsubscribe;
}

/**
 * Hooks up the “click on contact” → real-time chat view + send button.
 */
export function initChat(db, auth, leaderUid) {
  const contactList = document.getElementById('contact-list');
  const chatBox     = document.getElementById('chat-messages');
  const chatInput   = document.getElementById('chat-input');
  const sendBtn     = document.getElementById('send-message-btn');

  let currentUser    = null;
  let activeContact  = null;
  let activeChatId   = null;
  let unsubscribeMsg = null;

  auth.onAuthStateChanged(user => {
    currentUser = user;
  });

  // 1) Click on a contact → open that chat
  contactList?.addEventListener('click', async e => {
    if (e.target.tagName !== 'LI') return;
    contactList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');

    activeContact = e.target.textContent.replace('👤 ', '').trim();
    chatBox.innerHTML = '';

    unsubscribeMsg?.();

    // Get or create the chat document
    activeChatId = await findOrCreateChat(db, leaderUid, currentUser.email, activeContact);

    // Subscribe to messages
    unsubscribeMsg = startListeningToMessages(db, leaderUid, activeChatId, messages => {
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

  // 2) Sending a new message
  sendBtn?.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text || !activeChatId || !currentUser || !activeContact) return;

    await db
      .collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages')
      .add({
        text,
        sender:    currentUser.email,  // unified
        toEmail:   activeContact,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    chatInput.value = '';
  });
}
