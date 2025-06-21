// === CHAT BOILERPLATE ===
let activeContact = null;

// 1) When a contact is clicked, mark it active and load its chat
contactList.addEventListener('click', e => {
  if (e.target.tagName !== 'LI') return;
  document.querySelectorAll('#contact-list li').forEach(li => li.classList.remove('active'));
  e.target.classList.add('active');

  activeContact = e.target.textContent.replace('👤 ', '').trim();
  chatHeader.textContent = `Chatting with ${activeContact}`;
  chatBox.innerHTML = '';

  loadMessagesFor(activeContact);
});

// 2) Send button handler
sendBtn.addEventListener('click', async () => {
  const text = chatInput.value.trim();
  if (!text || !activeContact) return;

  const senderName = currentUser.displayName || currentUser.email;
  await db.collection('users').doc(leaderUid)
    .collection('chats').doc(activeContact)
    .collection('messages')
    .add({
      fromEmail: currentUser.email,
      fromName:  senderName,
      toEmail:   activeContact,
      text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

  chatInput.value = '';
  loadMessagesFor(activeContact);
});

// 3) Load messages for the chosen contact
async function loadMessagesFor(contactEmail) {
  chatBox.innerHTML = '';
  const snap = await db.collection('users').doc(leaderUid)
    .collection('chats').doc(contactEmail)
    .collection('messages')
    .orderBy('timestamp')
    .get();

  snap.forEach(doc => {
    const m = doc.data();
    const bubble = document.createElement('div');
    bubble.className = m.fromEmail === currentUser.email
      ? 'chat-bubble sent'
      : 'chat-bubble received';
    bubble.innerHTML = `<strong>${m.fromName}:</strong> ${m.text}`;
    chatBox.appendChild(bubble);
  });
}
