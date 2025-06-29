// snap.js — handles note snapshots (with delete + view tracking)
const db = window.db;
const auth = window.auth;

let currentUser = null;
let leaderUid = null;
let snapCount = 0;

// DOM
const textInput   = document.getElementById('text-input');
const snapBtn     = document.getElementById('snap-btn');
const snapBubble  = document.getElementById('snap-count');

// 📦 Snap container
let snapPopup = null;

// ✅ Auth listener
auth.onAuthStateChanged(async user => {
  if (!user) return;
  currentUser = user;
  leaderUid = user.uid;
  await countSnapshots();
});

// ✅ Count user's snapshots
async function countSnapshots() {
  const snapRef = db.collection('users').doc(leaderUid).collection('snaps');
  const snapDocs = await snapRef.get();
  snapCount = snapDocs.size;
  updateSnapBubble();
}

// ✅ Update bubble display
function updateSnapBubble() {
  if (snapCount > 0) {
    snapBubble.textContent = snapCount;
    snapBubble.style.display = 'block';
  } else {
    snapBubble.style.display = 'none';
  }
}

// ✅ Snap current note
snapBtn.addEventListener('click', async () => {
  const content = textInput.value.trim();
  if (!content) return alert('Nothing to snap!');

  await db.collection('users').doc(leaderUid).collection('snaps').add({
    content,
    snappedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  snapCount++;
  updateSnapBubble();
  alert('✅ Snapshot captured!');
});

// ✅ Show snapshots
snapBubble.addEventListener('click', async () => {
  const snapRef = db.collection('users').doc(leaderUid).collection('snaps');
  const snapDocs = await snapRef.orderBy('snappedAt', 'desc').get();

  if (!snapPopup) createSnapPopup();

  const list = snapPopup.querySelector('.snap-list');
  list.innerHTML = '';

  snapDocs.forEach(doc => {
    const data = doc.data();
    const snapId = doc.id;
    const div = document.createElement('div');
    div.className = 'snap-item';

    const preview = (data.content || '').split('\n')[0].slice(0, 50) + '...';
    const snapText = document.createElement('span');
    snapText.textContent = preview;
    snapText.style.cursor = 'pointer';
    snapText.style.flexGrow = '1';

    // 🔁 On click, load content + delete snap + update counter
    snapText.addEventListener('click', async () => {
      textInput.value = data.content || '';
      await db.collection('users').doc(leaderUid)
        .collection('snaps').doc(snapId).delete();
      div.remove(); // remove from DOM
      snapCount--;
      updateSnapBubble();
      snapPopup.style.display = 'none';
    });

    // 🗑️ Delete button (only delete, don't load)
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.style = 'background:none;border:none;cursor:pointer;color:red;';
    delBtn.title = 'Delete snapshot';

    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmDel = confirm('Delete this snapshot?');
      if (!confirmDel) return;
      await db.collection('users').doc(leaderUid)
        .collection('snaps').doc(snapId).delete();
      div.remove();
      snapCount--;
      updateSnapBubble();
    });

    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.appendChild(snapText);
    div.appendChild(delBtn);
    list.appendChild(div);
  });

  snapPopup.style.display = 'block';
});

// ✅ Create the floating snap panel
function createSnapPopup() {
  snapPopup = document.createElement('div');
  snapPopup.className = 'snap-popup';
  snapPopup.style = `
    position: absolute;
    right: 20px;
    top: 80px;
    background: white;
    border: 1px solid #ccc;
    width: 300px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    z-index: 1000;
    display: none;
    padding: 10px;
  `;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖';
  closeBtn.style = 'float:right; background:none; border:none; cursor:pointer;';
  closeBtn.onclick = () => (snapPopup.style.display = 'none');

  const header = document.createElement('div');
  header.innerHTML = `<strong>📸 Your Snaps</strong>`;
  header.appendChild(closeBtn);

  const list = document.createElement('div');
  list.className = 'snap-list';

  snapPopup.appendChild(header);
  snapPopup.appendChild(list);
  document.body.appendChild(snapPopup);
}
