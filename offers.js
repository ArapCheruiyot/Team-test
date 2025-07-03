// offers.js — Final Fix: Accurate Excel Row Matching (Standalone Logic)
let uploadedFiles = JSON.parse(localStorage.getItem('uploadedOffers') || '[]');
let parsedFiles = {}; // { filename: [ [row1], [row2] ] }

try {
  parsedFiles = JSON.parse(localStorage.getItem('parsedFileContents') || '{}');
  console.log('✅ Restored parsed contents from localStorage.');
} catch (err) {
  console.warn('⚠️ Could not restore parsed files:', err);
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const filesList = document.getElementById('uploaded-files-list');
  const searchInput = document.getElementById('offer-search-input');
  const searchResults = document.createElement('div');
  searchResults.id = 'search-results';
  document.querySelector('.offer-search')?.after(searchResults);

  renderFiles();

  // File Upload Handler
  fileInput.addEventListener('change', async (e) => {
    const selectedFiles = Array.from(e.target.files).filter(file =>
      /\.(xlsx?|csv)$/i.test(file.name)
    );

    if (!selectedFiles.length) return;

    for (const file of selectedFiles) {
      uploadedFiles.push({ name: file.name, size: file.size });
      const parsed = await parseFile(file); // [[row1], [row2]]
      parsedFiles[file.name] = parsed;
      console.log(`📄 Parsed "${file.name}" (${parsed.length} rows)`);
    }

    saveToStorage();
    renderFiles();
    fileInput.value = '';
  });

  // Search Handler
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim();
    const results = [];

    if (!query) {
      showSearchResults([]);
      return;
    }

    for (const filename in parsedFiles) {
      const rows = parsedFiles[filename];
      for (const row of rows) {
        if (Array.isArray(row)) {
          const match = row.some(cell => String(cell).trim() === query);
          if (match) {
            results.push({ row, __file: filename });
          }
        }
      }
    }

    console.log(`🔍 Search: "${query}" → ${results.length} match(es)`);
    showSearchResults(results.slice(0, 50));
  });

  // File Delete Handler
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const name = e.target.getAttribute('data-name');
      uploadedFiles = uploadedFiles.filter(f => f.name !== name);
      delete parsedFiles[name];
      saveToStorage();
      renderFiles();
      showSearchResults([]);
      console.log(`🗑️ Deleted: ${name}`);
    }
  });

  // Sign Out = Clear all
  document.getElementById('signout')?.addEventListener('click', () => {
    localStorage.removeItem('uploadedOffers');
    localStorage.removeItem('parsedFileContents');
    console.log('🚪 Signed out: Local storage cleared.');
  });

  function saveToStorage() {
    localStorage.setItem('uploadedOffers', JSON.stringify(uploadedFiles));
    localStorage.setItem('parsedFileContents', JSON.stringify(parsedFiles));
  }

  function renderFiles() {
    filesList.innerHTML = '';
    if (!uploadedFiles.length) {
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
      searchResults.innerHTML = '<p style="margin-left: 20px;">🔍 No matches found.</p>';
      return;
    }

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '10px';

    matches.forEach(match => {
      const li = document.createElement('li');
      li.style.borderBottom = '1px solid #ddd';
      li.style.padding = '4px';
      li.textContent = `[${match.__file}] ` + match.row.map(cell => `${cell}`).join(' | ');
      list.appendChild(li);
    });

    searchResults.appendChild(list);
  }

  function parseFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          let allRows = [];

          workbook.SheetNames.forEach(sheetName => {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            allRows = allRows.concat(rows);
          });

          resolve(allRows);
        } catch (err) {
          console.error(`❌ Failed to parse "${file.name}"`, err);
          resolve([]);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
});
