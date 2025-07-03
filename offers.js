// offers.js — Handles offer file uploads in-browser
let uploadedFiles = JSON.parse(localStorage.getItem('uploadedOffers') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const filesList = document.getElementById('uploaded-files-list');

  // Restore files on load
  renderFiles();

  // Listen for uploads
  fileInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files).filter(file =>
      /\.(xlsx?|csv)$/i.test(file.name)
    );

    uploadedFiles.push(...newFiles.map(f => ({ name: f.name, size: f.size })));
    saveAndRender();
    fileInput.value = ''; // Clear input
  });

  // Handle delete clicks
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const name = e.target.getAttribute('data-name');
      uploadedFiles = uploadedFiles.filter(f => f.name !== name);
      saveAndRender();
    }
  });

  // Clear files on logout
  document.getElementById('signout')?.addEventListener('click', () => {
    localStorage.removeItem('uploadedOffers');
  });

  function saveAndRender() {
    localStorage.setItem('uploadedOffers', JSON.stringify(uploadedFiles));
    renderFiles();
  }

  function renderFiles() {
    filesList.innerHTML = '';
    if (uploadedFiles.length === 0) {
      filesList.innerHTML = '<p>No files uploaded yet.</p>';
      return;
    }

    uploadedFiles.forEach(file => {
      const row = document.createElement('div');
      row.className = 'uploaded-file-row';
      row.innerHTML = `
        <span>📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
        <button class="delete-btn" data-name="${file.name}">🗑️ Delete</button>
      `;
      filesList.appendChild(row);
    });
  }
});
