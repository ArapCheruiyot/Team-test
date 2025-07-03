// offers.js — Enhanced: Upload + Delete + Instant Search (with numeric fix)
let uploadedFiles = JSON.parse(localStorage.getItem('uploadedOffers') || '[]');
const parsedFiles = {}; // store parsed data by filename

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const filesList = document.getElementById('uploaded-files-list');
  const searchInput = document.getElementById('offer-search-input');

  const searchResults = document.createElement('div');
  searchResults.id = 'search-results';
  document.querySelector('.offer-search')?.after(searchResults);

  renderFiles();

  // Upload listener
  fileInput.addEventListener('change', async (e) => {
    const newFiles = Array.from(e.target.files).filter(file =>
      /\.(xlsx?|csv)$/i.test(file.name)
    );

    for (const file of newFiles) {
      uploadedFiles.push({ name: file.name, size: file.size });
      const parsed = await parseFile(file);
      parsedFiles[file.name] = parsed;
    }

    saveAndRender();
    fileInput.value = '';
  });

  // Delete listener
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const name = e.target.getAttribute('data-name');
      uploadedFiles = uploadedFiles.filter(f => f.name !== name);
      delete parsedFiles[name];
      saveAndRender();
    }
  });

  // Signout clears memory
  document.getElementById('signout')?.addEventListener('click', () => {
    localStorage.removeItem('uploadedOffers');
  });

  // Search handler
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const matches = [];

    for (const filename in parsedFiles) {
      parsedFiles[filename].forEach(row => {
        const rowStr = Object.values(row)
          .map(v => String(v))  // ✅ Convert everything to string
          .join(' ')
          .toLowerCase();
        if (rowStr.includes(query)) {
          matches.push({ ...row, __file: filename });
        }
      });
    }

    showSearchResults(matches.slice(0, 50)); // show top 50 results
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
        .filter(([key]) => key !== '__file')
        .map(([key, val]) => `${val}`)
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
