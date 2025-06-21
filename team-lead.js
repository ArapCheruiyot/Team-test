// team-lead.js — Dashboard logic with agent vs owner roles

// Initialize when DOM is ready

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  const db = window.db;
  const auth = window.auth;

  // Determine agent mode and leader UID from URL
  const params = new URLSearchParams(window.location.search);
  const isAgent = params.get('asAgent') === 'true';
  const leaderUid = isAgent
    ? params.get('leader')
    : auth.currentUser && auth.currentUser.uid;

  console.log("🕵️ Agent mode:", isAgent, "leaderUid:", leaderUid);

  // Hide owner-only features for agents
  if (isAgent) {
    [
      'new-file', 'delete', 'add-contact-btn', 'start-chat-btn',
      'add-contact-form', 'start-chat-form'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const wel = document.getElementById('welcome');
    if (wel) wel.textContent += " (Agent)";
  }

  let currentUser = null;

  // Auth listener: only fire DB reads after user is known
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = 'index.html';
    currentUser = user;

    // Update welcome
    const welcomeEl = document.getElementById('welcome');
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${user.displayName || user.email}!` +
                              (isAgent ? ' (Agent)' : '');
    }

    // Load all data
    await loadNotes();
    await loadContacts();
    await loadChats();
  });

  // === NOTES ===
  const newBtn = document.getElementById('new-file');
  const delBtn = document.getElementById('delete');
  const fileNames = document.getElementById('file-names');
  const textArea = document.getElementById('text-input');
  let saveTimeout;

  async function loadNotes() {
    fileNames.innerHTML = '';
    const snap = await db.collection('users').doc(leaderUid)
      .collection('notes').orderBy('updatedAt','desc').get();
    snap.forEach(doc => {
      const note = doc.data();
      const title = note.title?.trim() || '(Untitled)';
      const div = document.createElement('div');
      div.className = 'note-item';
      div.textContent = title;
      div.onclick = () => openNote(doc.id, note);
      fileNames.appendChild(div);
    });
  }

  function openNote(id, note) {
    textArea.dataset.noteId = id;
    textArea.value = note.content || '';
    textArea.focus();
  }

  if (newBtn) newBtn.onclick = async () => {
    if (isAgent) return;
    const ref = await db.collection('users').doc(leaderUid)
      .collection('notes').add({
        title: '', content: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    openNote(ref.id, { content: '' });
    await loadNotes();
  };

  if (delBtn) delBtn.onclick = async () => {
    if (isAgent) return;
    const id = textArea.dataset.noteId; if (!id) return;
    await db.collection('users').doc(leaderUid)
      .collection('notes').doc(id).delete();
    textArea.value = '';
    delete textArea.dataset.noteId;
    await loadNotes();
  };

  textArea.oninput = () => {
    if (isAgent) return;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const id = textArea.dataset.noteId; if (!id) return;
      const content = textArea.value.trim();
      const title = content.split('\n')[0]?.trim() || '(Untitled)';
      await db.collection('users').doc(leaderUid)
        .collection('notes').doc(id)
        .update({ title, content, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await loadNotes();
    }, 500);
  };

  // === CONTACTS ===
  const addContactBtn  = document.getElementById('add-contact-btn');
  const saveContactBtn = document.getElementById('save-contact');
  const contactInput   = document.getElementById('contact-email');
  const contactList    = document.getElementById('contact-list');

  if (addContactBtn) addContactBtn.onclick = () => {
    if (isAgent) return;
    document.getElementById('add-contact-form').style.display = 'block';
  };

  if (saveContactBtn) saveContactBtn.onclick = async () => {
    if (isAgent) return;
    const em = contactInput.value.trim().toLowerCase(); if (!em) return;
    await db.collection('users').doc(leaderUid)
      .collection('contacts').add({ email: em, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    contactInput.value = '';
    await loadContacts();
  };

  async function loadContacts() {
    contactList.innerHTML = '';
    const snap = await db.collection('users').doc(leaderUid)
      .collection('contacts').orderBy('createdAt','desc').get();
    snap.forEach(doc => {
      const c = doc.data();
      const li = document.createElement('li');
      li.textContent = `👤 ${c.email}`;
      contactList.appendChild(li);
    });
  }

  // === CHATS ===
  const startChatBtn  = document.getElementById('start-chat-btn');
  const createChatBtn = document.getElementById('create-chat');
  const chatNameInput = document.getElementById('chat-name');
  const chatList      = document.getElementById('chat-list');
  const chatHeader    = document.getElementById('chat-header');
  const chatBox       = document.getElementById('chat-messages');
  let activeChatId    = null;

  if (startChatBtn) startChatBtn.onclick = () => {
    if (isAgent) return;
    document.getElementById('start-chat-form').style.display = 'block';
  };

  if (createChatBtn) createChatBtn.onclick = async () => {
    if (isAgent) return;
    const nm = chatNameInput.value.trim(); if (!nm) return;
    await db.collection('users').doc(leaderUid)
      .collection('chats').add({ participants: [currentUser.email], name: nm, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    chatNameInput.value = '';
    await loadChats();
  };

  async function loadChats() {
    chatList.innerHTML = '';
    const snap = await db.collection('users').doc(leaderUid)
      .collection('chats').where('participants','array-contains',currentUser.email)
      .orderBy('createdAt','desc').get();
    snap.forEach(doc => {
      const c = doc.data();
      const li = document.createElement('li');
      li.textContent = `💬 ${c.name}`;
      li.onclick = () => selectChat(doc.id, c.name);
      chatList.appendChild(li);
    });
  }

  function selectChat(id, nm) {
    activeChatId = id;
    chatHeader.textContent = `Chat: ${nm}`;
    chatBox.innerHTML = '';
    loadMessages();
  }

  // === MESSAGES ===
  const sendBtn  = document.getElementById('send-message-btn');
  const chatInput = document.getElementById('chat-input');

  if (sendBtn) sendBtn.onclick = async () => {
    if (!activeChatId) return alert("Select a chat first");
    const txt = chatInput.value.trim(); if (!txt) return;
    const senderName = currentUser.displayName || currentUser.email;
    await db.collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages').add({ fromEmail: currentUser.email, fromName: senderName, text: txt, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    chatInput.value = '';
    loadMessages();
  };

  async function loadMessages() {
    chatBox.innerHTML = '';
    const snap = await db.collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages').orderBy('timestamp').get();
    snap.forEach(doc => {
      const m = doc.data();
      const d = document.createElement('div');
      d.className = 'chat-bubble';
      d.innerHTML = `<strong>${m.fromName}:</strong> ${m.text}`;
      chatBox.appendChild(d);
    });
  }

});
