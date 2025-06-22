// team-lead.js — Dashboard logic (notes, contacts, chat, announcements)
import { initChat } from './chat.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ team-lead.js initialized");

  const db   = window.db;
  const auth = window.auth;

  const params  = new URLSearchParams(window.location.search);
  const isAgent = params.get('asAgent') === 'true';
  if (isAgent) {
  // Ensure banner is visible early in case delay happens
  const banner = document.getElementById('announcement-banner');
  if (banner) banner.style.display = 'block';
}


  if (isAgent) {
    ['new-file','delete','add-contact-btn','add-contact-form','announcement-panel']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    const wel = document.getElementById('welcome');
    if (wel) wel.textContent += ' (Agent)';
  }

  let currentUser = null;
  let leaderUid   = null;

  auth.onAuthStateChanged(async user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = user;

    if (isAgent) {
      leaderUid = 'A3HIWA6XWvhFcGdsM3o5IV0Qx3B2';
    } else {
      leaderUid = user.uid;
    }

    const welcomeEl = document.getElementById('welcome');
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${user.displayName || user.email}!` +
                              (isAgent ? ' (Agent)' : '');
    }

    await loadNotes();
    await loadContacts();
    await loadAnnouncement();

    initChat(db, auth, leaderUid);
  });

  // === ANNOUNCEMENT SECTION ===
  const announcementPanel = document.getElementById('announcement-panel');
  const announcementInput = document.getElementById('announcement-input');
  const postBtn = document.getElementById('post-announcement');
  const announcementDisplay = document.getElementById('announcement-display');
  const announcementText = document.getElementById('announcement-text');

  if (postBtn) postBtn.onclick = async () => {
  const text = announcementInput.value.trim();
  if (!text) return;
  try {
    await db.collection('users').doc('A3HIWA6XWvhFcGdsM3o5IV0Qx3B2')
      .collection('announcement').doc('latest')
      .set({
        text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    announcementInput.value = '';
    alert('✅ Announcement posted!');
  } catch (e) {
    console.error("Error posting announcement:", e);
  }
};


async function loadAnnouncement() {
  try {
    const doc = await db.collection('users').doc('A3HIWA6XWvhFcGdsM3o5IV0Qx3B2')
      .collection('announcement').doc('latest').get();

    console.log("🛠 Checking announcement for agent...");
    if (doc.exists) {
      const data = doc.data();
      console.log("📢 Announcement found:", data.text);

      if (isAgent) {
        const banner = document.getElementById('announcement-banner');
        const scrollText = document.getElementById('announcement-text-scroll');

        if (banner && scrollText) {
          scrollText.textContent = `📣 ${data.text}`;
          scrollText.style.display = 'inline-block';  // Ensure visible
          banner.style.display = 'flex';              // Make sure banner is flex
          banner.style.visibility = 'visible';        // Ensure it's visible
        }
      }
    } else {
      console.log("📭 No announcement found.");
    }
  } catch (e) {
    console.error("❌ Error loading announcement:", e);
  }
}

  // === NOTES SECTION ===
  const newBtn    = document.getElementById('new-file');
  const delBtn    = document.getElementById('delete');
  const fileNames = document.getElementById('file-names');
  const textArea  = document.getElementById('text-input');
  let saveTimeout = null;

  async function loadNotes() {
    fileNames.innerHTML = '';
    try {
      const snap = await db.collection('users')
        .doc(leaderUid)
        .collection('notes')
        .orderBy('updatedAt', 'desc')
        .get();
      snap.forEach(doc => {
        const note = doc.data();
        const div  = document.createElement('div');
        div.className = 'note-item';
        div.textContent = note.title?.trim() || '(Untitled)';
        div.onclick = () => openNote(doc.id, note);
        fileNames.appendChild(div);
      });
    } catch (e) {
      console.error("Error loading notes:", e);
    }
  }

  function openNote(id, note) {
    textArea.dataset.noteId = id;
    textArea.value = note.content || '';
    textArea.focus();
  }

  if (newBtn) newBtn.onclick = async () => {
    if (isAgent) return;
    try {
      const ref = await db.collection('users').doc(leaderUid)
        .collection('notes')
        .add({
          title: '',
          content: '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      openNote(ref.id, { content: '' });
      await loadNotes();
    } catch (e) {
      console.error("Error creating note:", e);
    }
  };

  if (delBtn) delBtn.onclick = async () => {
    if (isAgent) return;
    const id = textArea.dataset.noteId;
    if (!id) return;
    try {
      await db.collection('users').doc(leaderUid)
        .collection('notes').doc(id).delete();
      textArea.value = '';
      delete textArea.dataset.noteId;
      await loadNotes();
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  };

  textArea.oninput = () => {
    if (isAgent) return;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const id = textArea.dataset.noteId;
      if (!id) return;
      const content = textArea.value.trim();
      const title   = content.split('\n')[0]?.trim() || '(Untitled)';
      try {
        await db.collection('users').doc(leaderUid)
          .collection('notes').doc(id)
          .update({
            title,
            content,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        await loadNotes();
      } catch (e) {
        console.error("Auto-save error:", e);
      }
    }, 500);
  };

  // === CONTACTS SECTION ===
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
    const email = contactInput.value.trim().toLowerCase();
    if (!email) return;
    try {
      await db.collection('users').doc(leaderUid)
        .collection('contacts')
        .add({ email, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      contactInput.value = '';
      await loadContacts();
    } catch (e) {
      console.error("Error saving contact:", e);
    }
  };

  async function loadContacts() {
    contactList.innerHTML = '';
    try {
      const snap = await db.collection('users').doc(leaderUid)
        .collection('contacts')
        .orderBy('createdAt', 'desc')
        .get();
      snap.forEach(doc => {
        const c = doc.data();
        const li = document.createElement('li');
        li.textContent = `👤 ${c.email}`;
        contactList.appendChild(li);
      });
    } catch (e) {
      console.error("Failed to load contacts:", e);
    }
  }
});
