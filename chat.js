// chat.js — Modular chat logic (one-to-one messaging)

// This file handles the chat UI: selecting a contact, loading messages, and sending.

export function initChat(db, auth, leaderUid) {
  // DOM elements
  const contactList  = document.getElementById('contact-list');
  const chatHeader   = document.getElementById('chat-header');
  const chatBox      = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('send-message-btn');

  let currentUser = auth.currentUser;
  let activeContact = null;

  // 1) Contact click → select and load
  contactList.addEventListener('click', e => {
    if (e.target.tagName !== 'LI') return;
    // highlight
    contactList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');

    activeContact = e.target.textContent.replace('👤 ', '').trim();
    chatHeader.textContent = `Chatting with ${activeContact}`;
    chatBox.innerHTML = '';
    loadMessagesFor(activeContact);
  });

  // 2) Send message
  sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text || !activeContact) return;
    const senderName = currentUser.displayName || currentUser.email;

    await db.collection('users').doc(leaderUid)
      .collection('chats').doc(activeContact)
      .collection('messages')
      .add({
        fromEmail: currentUser.email,
        fromName: senderName,
        toEmail: activeContact,
        text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    chatInput.value = '';
    loadMessagesFor(activeContact);
  });

  // 3) Load messages for a contact
  async function loadMessagesFor(contactEmail) {
    chatBox.innerHTML = '';
    const snapshot = await db.collection('users').doc(leaderUid)
      .collection('chats').doc(contactEmail)
      .collection('messages')
      .orderBy('timestamp')
      .get();

    snapshot.forEach(doc => {
      const m = doc.data();
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${m.fromEmail === currentUser.email ? 'sent' : 'received'}`;
      bubble.innerHTML = `<strong>${m.fromName}:</strong> ${m.text}`;
      chatBox.appendChild(bubble);
    });
  }

  // Optionally, return a cleanup function
  return () => {
    contactList.replaceWith(contactList.cloneNode(true));
    sendBtn.replaceWith(sendBtn.cloneNode(true));
  };
}
