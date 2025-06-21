document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team‑lead.js initialized");

  const db   = window.db;
  const auth = window.auth;

  // Read URL params up front
  const params   = new URLSearchParams(window.location.search);
  const isAgent  = params.get('asAgent') === 'true';
  const leaderParam = params.get('leader'); // may be null for owner

  console.log("🕵️ Agent mode:", isAgent, "→ leaderParam:", leaderParam);

  // UI lockdown for agents
  if (isAgent) {
    [
      'new-file','delete',
      'add-contact-btn','start-chat-btn',
      'add-contact-form','start-chat-form'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const wel = document.getElementById('welcome');
    if (wel) wel.textContent += " (Agent)";
  }

  // We'll set this after login
  let leaderUid = null;
  let currentUser = null;

  // Once auth is ready, we know both currentUser and leaderUid
  auth.onAuthStateChanged(async user => {
    if (!user) {
      return window.location.href = 'index.html';
    }
    currentUser = user;
    leaderUid = isAgent ? leaderParam : user.uid;

    // now that leaderUid is valid, we can safely call Firestore
    document.getElementById('welcome').textContent =
      `Welcome, ${user.displayName||user.email}!` +
      (isAgent ? " (Agent)" : "");

    // Cache elements that depend on login
    const newBtn    = document.getElementById('new-file');
    const delBtn    = document.getElementById('delete');
    const fileNames = document.getElementById('file-names');
    const textArea  = document.getElementById('text-input');

    const addContactBtn  = document.getElementById('add-contact-btn');
    const saveContactBtn = document.getElementById('save-contact');
    const contactInput   = document.getElementById('contact-email');
    const contactList    = document.getElementById('contact-list');

    const startChatBtn  = document.getElementById('start-chat-btn');
    const createChatBtn = document.getElementById('create-chat');
    const chatNameInput = document.getElementById('chat-name');
    const chatList      = document.getElementById('chat-list');
    const chatInput     = document.getElementById('chat-input');
    const sendBtn       = document.getElementById('send-message-btn');
    const chatBox       = document.getElementById('chat-messages');
    const chatHeader    = document.getElementById('chat-header');

    // Helper to reload all panels
    loadNotes();
    loadContacts();
    loadChats();

    // == Notes ==
    let currentNoteId=null, saveTimeout=null;

    async function loadNotes() {
      fileNames.innerHTML = '';
      const snap = await db.collection('users')
        .doc(leaderUid)
        .collection('notes')
        .orderBy('updatedAt','desc')
        .get();
      snap.forEach(d => {
        const note = d.data();
        const title = note.title?.trim()||'(Untitled)';
        const div = document.createElement('div');
        div.className='note-item';
        div.textContent=title;
        div.onclick = () => openNote(d.id,note);
        fileNames.appendChild(div);
      });
    }

    function openNote(id,note){
      currentNoteId=id;
      textArea.dataset.noteId=id;
      textArea.value=note.content||'';
      textArea.focus();
    }

    if (newBtn) newBtn.onclick = async ()=>{
      if (isAgent) return;
      const ref = await db.collection('users')
        .doc(leaderUid)
        .collection('notes')
        .add({
          title:'', content:'',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      openNote(ref.id,{content:''});
      loadNotes();
    };

    if (delBtn) delBtn.onclick = async ()=>{
      if (isAgent) return;
      const id=textArea.dataset.noteId; if(!id) return;
      await db.collection('users')
        .doc(leaderUid)
        .collection('notes')
        .doc(id).delete();
      textArea.value=''; delete textArea.dataset.noteId;
      loadNotes();
    };

    textArea.oninput = ()=>{
      if (isAgent) return;
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async ()=>{
        const id=textArea.dataset.noteId; if(!id) return;
        const c=textArea.value.trim();
        const t=c.split('\n')[0]?.trim()||'(Untitled)';
        await db.collection('users')
          .doc(leaderUid)
          .collection('notes')
          .doc(id)
          .update({
            title:t, content:c,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        loadNotes();
      },500);
    };

    // == Contacts ==
    if (addContactBtn) addContactBtn.onclick = ()=>{
      if (isAgent) return;
      document.getElementById('add-contact-form').style.display='block';
    };
    if (saveContactBtn) saveContactBtn.onclick = async ()=>{
      if (isAgent) return;
      const email = contactInput.value.trim().toLowerCase(); if(!email) return;
      await db.collection('users')
        .doc(leaderUid)
        .collection('contacts')
        .add({ email, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      contactInput.value=''; loadContacts();
    };
    async function loadContacts() {
      contactList.innerHTML='';
      const snap = await db.collection('users')
        .doc(leaderUid)
        .collection('contacts')
        .orderBy('createdAt','desc')
        .get();
      snap.forEach(d => {
        const c=d.data(), li=document.createElement('li');
        li.textContent=`👤 ${c.email}`; contactList.appendChild(li);
      });
    }

    // == Chats ==
    let activeChatId=null;
    if (startChatBtn) startChatBtn.onclick = ()=>{
      if (isAgent) return;
      document.getElementById('start-chat-form').style.display='block';
    };
    if (createChatBtn) createChatBtn.onclick = async ()=>{
      if (isAgent) return;
      const name=chatNameInput.value.trim(); if(!name) return;
      const ref = await db.collection('users')
        .doc(leaderUid)
        .collection('chats')
        .add({
          participants: [currentUser.email],
          name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      chatNameInput.value=''; loadChats();
    };
    async function loadChats() {
      chatList.innerHTML='';
      const snap = await db.collection('users')
        .doc(leaderUid)
        .collection('chats')
        .where('participants','array-contains', currentUser.email)
        .orderBy('createdAt','desc')
        .get();
      snap.forEach(d => {
        const c=d.data(), li=document.createElement('li');
        li.textContent=`💬 ${c.name}`;
        li.onclick = ()=>selectChat(d.id, c.name);
        chatList.appendChild(li);
      });
    }
    function selectChat(id,name){
      activeChatId=id;
      chatHeader.textContent = `Chat: ${name}`;
      chatBox.innerHTML='';
      loadMessages();
    }

    if (sendBtn) sendBtn.onclick = async ()=>{
      if (!activeChatId) return alert("Select a chat first");
      const txt=chatInput.value.trim(); if(!txt) return;
      const senderName = currentUser.displayName||currentUser.email;
      await db.collection('users').doc(leaderUid)
        .collection('chats').doc(activeChatId)
        .collection('messages')
        .add({
          fromEmail: currentUser.email,
          fromName: senderName,
          text: txt,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      chatInput.value=''; loadMessages();
    };
    async function loadMessages() {
      chatBox.innerHTML='';
      const snap = await db.collection('users').doc(leaderUid)
        .collection('chats').doc(activeChatId)
        .collection('messages')
        .orderBy('timestamp')
        .get();
      snap.forEach(d => {
        const m=d.data(), div=document.createElement('div');
        div.className='chat-bubble';
        div.innerHTML=`<strong>${m.fromName}:</strong> ${m.text}`;
        chatBox.appendChild(div);
      });
    }

    // Finally initial load
    loadContacts();
    loadChats();
  });
});
