// offers.js — Final Stable Version: Upload + Search + Logging + Restore
let uploadedFiles = JSON.parse(localStorage.getItem('uploadedOffers') || '[]');
const parsedFiles = {};

try {
  const restored = JSON.parse(localStorage.getItem('parsedFileContents') || '{}');
  Object.assign(parsedFiles, restored);
  console.log('✅ Restored parsed data from localStorage');
} catch (e) {
  console.warn('⚠️ Failed to restore parsed file data:', e);
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const filesList = document.getElementById('uploaded-files-list');
  const searchInput = document.getElementById('offer-search-input');

  const searchResults = document.createElement('div');
  searchResults.id = 'search-results';
  document.querySelector('.offer-search')?.after(searchResults);

  console.log('📦 App Ready. Files in memory:', uploadedFiles);
  renderFiles();

  // Upload Handler
  fileInput.addEventListener('change', async (e) => {
    const newFiles = Array.from(e.target.files).filter(file =>
      /\.(xlsx?|csv)$/i.test(file.name)
    );

    if (!newFiles.length) {
      console.warn('⚠️ No valid files selected');
      return;
    }

    console.log(`⬆️ Uploading ${newFiles.length} file(s)...`);

    for (const file of newFiles) {
      uploadedFiles.push({ name: file.name, size: file.size });
      const parsed = await parseFile(file);
      parsedFiles[file.name] = parsed;
      console.log(`📄 Parsed "${file.name}" — ${parsed.length} rows`);
    }

    saveAll();
    fileInput.value = '';
  });

  // Delete Handler
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const name = e.target.getAttribute('data-name');
      uploadedFiles = uploadedFiles.filter(f => f.name !== name);
      delete parsedFiles[name];
      saveAll();
      console.log(`🗑️ Deleted "${name}"`);
    }
  });

  // Sign Out
  document.getElementById('signout')?.addEventListener('click', () => {
    localStorage.removeItem('uploadedOffers');
    localStorage.removeItem('parsedFileContents');
    console.log('🚪 Cleared all local data on signout');
  });

  // Live Search
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const matches = [];

    if (!query) {
      searchResults.innerHTML = '';
      return;
    }

    console.log(`🔍 Searching for: "${query}"`);

    for (const file in parsedFiles) {
      parsedFiles[file].forEach(row => {
        const combinedText = Object.values(row)
          .map(v => String(v ?? '').toLowerCase())
          .join(' ');
        if (combinedText.includes(query)) {
          matches.push({ ...row, __file: file });
        }
      });
    }

    console.log(`✅ Found ${matches.length} matches`);
    showSearchResults(matches.slice(0, 50));
  });

  // Utilities
  function saveAll() {
    localStorage.setItem('uploadedOffers', JSON.stringify(uploadedFiles));
    localStorage.setItem('parsedFileContents', JSON.stringify(parsedFiles));
    renderFiles();
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
      li.textContent = `[${match.__file}] ` +
        Object.entries(match)
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
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          resolve(json);
        } catch (err) {
          console.error(`❌ Failed to parse ${file.name}`, err);
          resolve([]);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
});
