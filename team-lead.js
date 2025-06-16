console.log("✅ team‑lead.js loaded");

"use strict";

// Get DOM elements from the HTML
const newFileBtn      = document.getElementById("new-file");
const deleteBtn       = document.getElementById("delete");
const searchBtn       = document.getElementById("search");
const searchInput     = document.getElementById("search-input");
const fileNamesHolder = document.getElementById("file-names");
const textInput       = document.getElementById("text-input");

let currentNoteId = null; // holds the ID of the note being edited

// Reference the Firestore "notes" collection
const notesRef = db.collection("notes");

// ----------------------
// Utility Functions
// ----------------------

// Render the list of notes in the sidebar
function renderNotes(notes) {
  fileNamesHolder.innerHTML = ""; // clear existing list
  notes.forEach(note => {
    const noteDiv = document.createElement("div");
    noteDiv.textContent = note.title || "Untitled Note";
    noteDiv.dataset.noteId = note.id;
    noteDiv.classList.add("note-item");
    // Clicking a note loads its content in the editor
    noteDiv.addEventListener("click", () => {
      loadNote(note.id);
    });
    fileNamesHolder.appendChild(noteDiv);
  });
}

// Load all notes for the current user in real time
function loadNotes() {
  const user = auth.currentUser;
  if (!user) return;
  // Query notes by the current user's UID
  notesRef.where("uid", "==", user.uid)
    .onSnapshot(snapshot => {
      const notes = [];
      snapshot.forEach(doc => {
        notes.push({ id: doc.id, ...doc.data() });
      });
      renderNotes(notes);
    }, err => {
      console.error("Error fetching notes:", err);
    });
}

// Load a specific note from Firestore into the text area
function loadNote(noteId) {
  currentNoteId = noteId;
  notesRef.doc(noteId)
    .get()
    .then(doc => {
      if (doc.exists) {
        const noteData = doc.data();
        textInput.value = noteData.content || "";
      }
    })
    .catch(err => console.error("Error loading note:", err));
}

// ----------------------
// Event Listeners & Handlers
// ----------------------

// Create a new note when the New Note button is clicked
newFileBtn.addEventListener("click", () => {
  const user = auth.currentUser;
  if (!user) return;

  // Add a new document for this note with default values
  notesRef.add({
    uid: user.uid,
    title: "New Note",
    content: ""
  })
  .then(docRef => {
    currentNoteId = docRef.id;
  })
  .catch(err => console.error("Error creating note:", err));
});

// Delete the currently open note when Delete is clicked
deleteBtn.addEventListener("click", () => {
  if (currentNoteId) {
    notesRef.doc(currentNoteId)
      .delete()
      .then(() => {
        // Clear the editor when deletion is complete
        textInput.value = "";
        currentNoteId = null;
      })
      .catch(err => console.error("Error deleting note:", err));
  }
});

// Debounce timer variables for saving changes
let typingTimer;
const typingDelay = 500; // update Firestore 500ms after typing stops

// Update note content in Firestore as the user types
textInput.addEventListener("input", () => {
  // Reset the timer on every input event
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    if (currentNoteId) {
      notesRef.doc(currentNoteId)
        .update({ content: textInput.value })
        .catch(err => console.error("Error updating note:", err));
    }
  }, typingDelay);
});

// Toggle the search input field on and off
searchBtn.addEventListener("click", () => {
  if (searchInput.style.display === "none" || searchInput.style.display === "") {
    searchInput.style.display = "block";
    searchInput.focus();
  } else {
    searchInput.style.display = "none";
    searchInput.value = ""; // clear search when hiding
    // Restore full note list when search is canceled
    Array.from(fileNamesHolder.children).forEach(item => {
      item.style.display = "block";
    });
  }
});

// Filter and show matching notes as the user types a query
searchInput.addEventListener("input", () => {
  const searchTerm = searchInput.value.toLowerCase();
  Array.from(fileNamesHolder.children).forEach(item => {
    const title = item.textContent.toLowerCase();
    item.style.display = title.includes(searchTerm) ? "block" : "none";
  });
});

// Initialize notes loading once the window is fully loaded
window.addEventListener("load", loadNotes);
