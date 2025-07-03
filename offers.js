// offers.js — Smart Upload + Instant Search on Excel/CSV

let uploadedFiles = JSON.parse(localStorage.getItem('uploadedOffers') || '[]');
let parsedData = []; // holds all cell data from all files

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const filesList = document.getElementById('uploaded-files-list');
  const searchInput = document.getElementById('offer-search-input');
  const searchResults = document.createElement('div');
  searchResults.id = 'search-results';
  document.querySelector('.offer-search').after(searchResults);

  // Restore uploadedFiles & parse if any
  renderFiles();

  // Handle file upload
  fileInput.addEventListener('change', async (e) => {
    const newFiles = Array.from(e.target.files).filter(file =>
      /\.(xlsx?|csv)$/i.test(file.name)
    );

    for (const file of newFiles) {
      uploadedFiles.push({ name: file.name, size: file.size });

      const parsed = await parseFile(file);
      parsedData.push(...parsed);
    }

    saveAndRender();
    fileInput.value = '';
  });

  // Handle delete
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const name = e.target.getAttribute('data-name');
      uploadedFiles = uploadedFiles.filter(f => f.name !== name);
      parsedData = parsedData.filter(row => row.__source !== name);
      saveAndRender();
    }
  });

  // Clear on signout
  document.getElementById('signout')?.addEventListener('click', () => {
    localStorage.removeItem('uploadedOffers');
  });

  // Instant Search
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    const matches = parsedData.filter(row =>
      Object.values(row).some(val =>
        typeof val === 'string' && val.toLowerCase().includes(term)
      )
    );

    showSearchResults(matches);
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

  function showSearchResults(matches) {
    searchResults.innerHTML = '';
    if (!matches.length) {
      searchResults.innerHTML = '<p style="margin-left: 20px;">🔍 No results found.</p>';
      return;
    }

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.paddingLeft = '20px';

    matches.slice(0, 50).forEach(row => {
      const li = document.createElement('li');
      li.textContent = Object.values(row).join(' | ');
      li.style.borderBottom = '1px solid #ccc';
      li.style.padding = '4px 0';
      list.appendChild(li);
    });

    searchResults.appendChild(list);
  }

  // Helper: Parse Excel or CSV using SheetJS
  function parseFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet);
        const tagged = json.map(row => ({ ...row, __source: file.name }));
        resolve(tagged);
      };
      reader.readAsArrayBuffer(file);
    });
  }
});
