console.log("✅ offers.js loaded and DOM fully ready");

let uploadedFiles = [];
let fileData = {}; // filename => data

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const addBtn = document.getElementById('add-files-btn');
  const filesList = document.getElementById('uploaded-files-list');
  const resultsContainer = document.getElementById('search-results');
  const bannerText = document.getElementById('announcement-text-scroll');

  if (!fileInput || !addBtn || !filesList || !resultsContainer || !bannerText) {
    console.warn("❗ Missing essential DOM elements.");
    return;
  }

  // Upload logic
  addBtn.addEventListener('click', () => {
    const files = fileInput.files;
    if (!files.length) {
      alert('Please select one or more Excel/CSV files.');
      return;
    }

    for (let file of files) {
      if (!uploadedFiles.includes(file.name)) {
        uploadedFiles.push(file.name);
        readExcelFile(file);
      } else {
        alert(`File "${file.name}" is already uploaded.`);
      }
    }

    updateFileList();
    fileInput.value = '';
  });

  function updateFileList() {
    filesList.innerHTML = '<strong>Uploaded Files:</strong><br>';
    uploadedFiles.forEach((fileName, index) => {
      const div = document.createElement('div');
      div.textContent = `${index + 1}. ${fileName}`;
      filesList.appendChild(div);
    });
  }

  function readExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      let allRows = [];
      workbook.SheetNames.forEach(sheet => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 });
        allRows = allRows.concat(rows);
      });

      fileData[file.name] = allRows;
      console.log(`✅ Parsed "${file.name}" with ${allRows.length} rows.`);
    };
    reader.readAsArrayBuffer(file);
  }

  // 🔍 Search logic
  const searchBtn = document.getElementById('offer-search-btn');
  const searchInput = document.getElementById('offer-search-input');

  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    resultsContainer.innerHTML = '';

    console.log("🔍 User searched for:", query);

    if (!query) {
      resultsContainer.textContent = '⚠️ Please enter a customer number.';
      return;
    }

    if (!uploadedFiles.length) {
      resultsContainer.textContent = '⚠️ No files uploaded yet.';
      return;
    }

    let found = false;

    for (const fileName of uploadedFiles) {
      const rows = fileData[fileName];
      if (!rows || rows.length < 2) continue;

      const headers = rows[0];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        if (Array.isArray(row) && row.some(cell => String(cell).trim() === query)) {
          console.log("📂 Searching in file:", fileName, `(${rows.length} rows)`);
          console.log("✅ Match found in row:", row);

          const formatted = row.map((cell, idx) => {
            const isPossibleDate = typeof cell === 'number' && cell > 40000 && cell < 80000;
            if (isPossibleDate) {
              try {
                const date = excelDateToJSDate(cell);
                return `${headers?.[idx] || 'Column ' + (idx + 1)}: ${date.toLocaleDateString()}`;
              } catch {
                return `${headers?.[idx] || 'Column ' + (idx + 1)}: ${cell}`;
              }
            }
            return `${headers?.[idx] || 'Column ' + (idx + 1)}: ${cell}`;
          });

          bannerText.style.display = 'none'; // hide announcement scroll
          resultsContainer.innerHTML = `<pre>${formatted.join('\n')}</pre>`;
          found = true;

          // Restore banner after 15 sec
          setTimeout(() => {
            resultsContainer.innerHTML = '';
            bannerText.style.display = 'inline';
          }, 15000);

          break;
        }
      }

      if (found) break;
    }

    if (!found) {
      resultsContainer.textContent = '❌ Customer not found in any file.';
    }
  });
});

// Excel serial date to JS date
function excelDateToJSDate(excelDate) {
  const msPerDay = 86400000;
  const epoch = new Date(Date.UTC(1970, 0, 1));
  return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}
