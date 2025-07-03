// offers.js — Dev Edition: Upload + Search + Debug Logs
let uploadedFiles = JSON.parse(localStorage.getItem('uploadedOffers') || '[]');
const parsedFiles = {};

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const filesList = document.getElementById('uploaded-files-list');
  const searchInput = document.getElementById('offer-search-input');

  const searchResults = document.createElement('div');
  searchResults.id = 'search-results';
  document.querySelector('.offer-search')?.after(searchResults);

  // Log startup
  console.log('📦 App Loaded. Files in memory:', uploadedFiles);

  renderFiles();

  // Load previously parsed data (if any)
  (async () => {
    const stored = localStorage.getItem('parsedFileContents');
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.assign(parsedFiles, parsed);
      console.log('🔁 Restored parsed file contents from localStorage.');
    }
  })();

  // File Upload
  fileInput.addEventListener('change', async (e) => {
    const newFiles = Array.from(e.target.files).filter(file =>
      /\.(xlsx?|csv)$/i.test(file.name)
    );

    if (!newFiles.length) {
      console.warn('⚠️ No valid Excel/CSV files selected.');
      return;
    }

    console.log(`⬆️ Uploading ${newFiles.length} file(s)...`);

    for (const file of newFiles) {
      uploadedFiles.push({ name: file.name, size: file.size });
      const parsed = await parseFile(file);
      parsedFiles[file.name] = parsed;
      console.log(`📄 Parsed "${file.name}" — ${parsed.length} rows`);
    }

    localStorage.setItem('parsedFileContents', JSON.stringify(parsedFiles));
    saveAndRender();
    fileInput.value = '';
  });

  // File Deletion
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const name = e.target.getAttribute('data-name');
      uploadedFiles = uploadedFiles.filter(f => f.name !== name);
      delete parsedFiles[name];
      saveAndRender();
      localStorage.setItem('parsedFileContents', JSON.stringify(parsedFiles));
      console.log(`🗑️ Deleted file: ${name}`);
    }
  });

  // Signout
  document.getElementById('signout')?.addEventListener('click', () => {
    localStorage.removeItem('uploadedOffers');
    localStorage.removeItem('parsedFileContents');
    console.log('🚪 User signed out. Local storage cleared.');
  });

  // Search Input
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const matches = [];

    console.log(`🔎 Searching for: "${query}"`);

    for (const filename in parsedFiles) {
      parsedFiles[filename].forEach(row => {
        const rowText = Object.values(row)
          .map(val => String(val ?? '').toLowerCase())
          .join(' ');

        if (rowText.includes(query)) {
          matches.push({ ...row, __file: filename });
        }
      });
    }

    console.log(`✅ Found ${matches.length} matches for: "${query}"`);
    showSearchResults(matches.slice(0, 50));
  });

  // Utility Functions
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
      li.textContent = `[${match.__file}] ` + Object.entries(match)
        .filter(([k]) => k !== '__file')
        .map(([_, v]) => `${v}`)
        .join(' | ');
      list.appendChild(li);
    });

    searchResults.appendChild(list);
  }

  function parseFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        resolve(json);
      };
      reader.readAsArrayBuffer(file);
    });
  }
});
