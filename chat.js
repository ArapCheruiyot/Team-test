// chat.js — Modular one-to-one messaging logic

export function initChat(db, auth, leaderUid) {
  const contactList  = document.getElementById('contact-list');
  const chatHeader   = document.getElementById('chat-header');
  const chatBox      = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('send-message-btn');

  let currentUser = auth.currentUser;
  let activeContact = null;
  let activeChatId = null;

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

    await db.collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages').add({
        text,
        fromEmail: currentUser.email,
        toEmail: activeContact,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    chatInput.value = '';
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
      bubble.innerHTML = `<strong>${m.fromEmail}:</strong> ${m.text}`;
      chatBox.appendChild(bubble);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
