document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  const db   = window.db;
  const auth = window.auth;

  // ── Determine workspace owner (leader) and role ───────────────────
  const params   = new URLSearchParams(window.location.search);
  const isAgent  = params.get('asAgent') === 'true';
  const leaderUid = isAgent
    ? params.get('leader')
    : auth.currentUser && auth.currentUser.uid;

  console.log("🕵️ Agent mode:", isAgent, "→ leaderUid:", leaderUid);

  // ── UI Lockdown for Agents ─────────────────────────────────────────
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

  // ── Auth & Initial Load ───────────────────────────────────────────
  let currentUser = null;
  auth.onAuthStateChanged(user => {
    if (!user) return window.location.href = 'index.html';
    currentUser = user;
    document.getElementById('welcome').textContent =
      `Welcome, ${user.displayName || user.email}!` +
      (isAgent ? " (Agent)" : "");
    loadNotes();
    loadContacts();
    loadChats();
  });

  // ── NOTES (uses leaderUid) ────────────────────────────────────────
  const newBtn = document.getElementById('new-file');
  const delBtn = document.getElementById('delete');
  const fileNames = document.getElementById('file-names');
  const textArea  = document.getElementById('text-input');
  let currentNoteId=null, saveTimeout=null;

  async function loadNotes() {
    fileNames.innerHTML = '';
    const snapshot = await db
      .collection('users').doc(leaderUid)
      .collection('notes')
      .orderBy('updatedAt','desc')
      .get();
    snapshot.forEach(doc => {
      const note = doc.data();
      const title = note.title?.trim() || '(Untitled)';
      const div = document.createElement('div');
      div.className='note-item';
      div.textContent=title;
      div.onclick=() => openNote(doc.id,note);
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
    const ref = await db
      .collection('users').doc(leaderUid)
      .collection('notes')
      .add({
        title:'',content:'',
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    openNote(ref.id,{content:''});
    loadNotes();
  };

  if (delBtn) delBtn.onclick = async ()=>{
    if (isAgent) return;
    const id=textArea.dataset.noteId; if(!id)return;
    await db
      .collection('users').doc(leaderUid)
      .collection('notes').doc(id).delete();
    textArea.value=''; delete textArea.dataset.noteId;
    loadNotes();
  };

  textArea.oninput = ()=>{
    if (isAgent) return;
    clearTimeout(saveTimeout);
    saveTimeout=setTimeout(async ()=>{
      const id=textArea.dataset.noteId; if(!id)return;
      const c=textArea.value.trim();
      const t=c.split('\n')[0]?.trim()||'(Untitled)';
      await db
        .collection('users').doc(leaderUid)
        .collection('notes').doc(id)
        .update({
          title:t,content:c,
          updatedAt:firebase.firestore.FieldValue.serverTimestamp()
        });
      loadNotes();
    },500);
  };

  // ── CONTACTS ───────────────────────────────────────────────────────
  const addContactBtn  = document.getElementById('add-contact-btn');
  const saveContactBtn = document.getElementById('save-contact');
  const contactInput   = document.getElementById('contact-email');
  const contactList    = document.getElementById('contact-list');

  if (addContactBtn) addContactBtn.onclick = ()=>{
    if (isAgent) return;
    document.getElementById('add-contact-form').style.display='block';
  };

  if (saveContactBtn) saveContactBtn.onclick = async ()=>{
    if (isAgent) return;
    const email=contactInput.value.trim().toLowerCase(); if(!email)return;
    await db
      .collection('users').doc(leaderUid)
      .collection('contacts')
      .add({email,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    contactInput.value=''; loadContacts();
  };

  async function loadContacts() {
    contactList.innerHTML='';
    const snap = await db
      .collection('users').doc(leaderUid)
      .collection('contacts').orderBy('createdAt','desc').get();
    snap.forEach(doc=>{
      const c=doc.data();
      const li=document.createElement('li');
      li.textContent=`👤 ${c.email}`;
      contactList.appendChild(li);
    });
  }

  // ── CHATS & MESSAGES ───────────────────────────────────────────────
  const startChatBtn  = document.getElementById('start-chat-btn');
  const createChatBtn = document.getElementById('create-chat');
  const chatNameInput = document.getElementById('chat-name');
  const chatList      = document.getElementById('chat-list');
  const chatInput     = document.getElementById('chat-input');
  const sendBtn       = document.getElementById('send-message-btn');
  const chatBox       = document.getElementById('chat-messages');
  const chatHeader    = document.getElementById('chat-header');
  let activeChatId    = null;

  if (startChatBtn) startChatBtn.onclick = ()=>{
    if (isAgent) return;
    document.getElementById('start-chat-form').style.display='block';
  };

  if (createChatBtn) createChatBtn.onclick = async ()=>{
    if (isAgent) return;
    const name = chatNameInput.value.trim(); if(!name)return;
    const ref = await db
      .collection('users').doc(leaderUid)
      .collection('chats')
      .add({ participants:[currentUser.email], name,
             createdAt:firebase.firestore.FieldValue.serverTimestamp() });
    chatNameInput.value=''; loadChats();
  };

  async function loadChats() {
    chatList.innerHTML='';
    const snap = await db
      .collection('users').doc(leaderUid)
      .collection('chats')
      .where('participants','array-contains', currentUser.email)
      .orderBy('createdAt','desc')
      .get();
    snap.forEach(doc=>{
      const c=doc.data();
      const li=document.createElement('li');
      li.textContent=`💬 ${c.name}`;
      li.onclick=()=> selectChat(doc.id,c.name);
      chatList.appendChild(li);
    });
  }

  function selectChat(chatId, name) {
    activeChatId=chatId;
    chatHeader.textContent = `Chat: ${name}`;
    chatBox.innerHTML=''; loadMessages();
  }

  if (sendBtn) sendBtn.onclick = async ()=>{
    if (!activeChatId) return alert("Select a chat first");
    const txt=chatInput.value.trim(); if(!txt)return;
    const senderName = auth.currentUser.displayName || auth.currentUser.email;
    await db
      .collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages')
      .add({ fromEmail:currentUser.email,
             fromName:senderName,
             text:txt,
             timestamp:firebase.firestore.FieldValue.serverTimestamp() });
    chatInput.value=''; loadMessages();
  };

  async function loadMessages() {
    chatBox.innerHTML='';
    const snap = await db
      .collection('users').doc(leaderUid)
      .collection('chats').doc(activeChatId)
      .collection('messages')
      .orderBy('timestamp')
      .get();
    snap.forEach(doc=>{
      const m=doc.data();
      const d=document.createElement('div');
      d.className='chat-bubble';
      d.innerHTML=`<strong>${m.fromName}:</strong> ${m.text}`;
      chatBox.appendChild(d);
    });
  }

  // initial load
  loadContacts();
  loadChats();
});
