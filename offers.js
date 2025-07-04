console.log("✅ offers.js loaded and DOM fully ready");

let uploadedFiles = [];
let fileData = {};

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const addBtn = document.getElementById('add-files-btn');
  const filesList = document.getElementById('uploaded-files-list');

  if (!fileInput || !addBtn || !filesList) {
    console.warn("❗ Required elements not found in DOM. Aborting offers.js.");
    return;
  }

  addBtn.addEventListener('click', () => {
    const files = fileInput.files;
    if (!files.length) {
      alert('Please select one or more Excel/CSV files.');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
});

// 🔍 Offer Search Logic
document.getElementById('offer-search-btn').addEventListener('click', () => {
  const query = document.getElementById('offer-search-input').value.trim();
  const resultsContainer = document.getElementById('search-results');
  const announcementScroll = document.getElementById('announcement-text-scroll');

  resultsContainer.innerHTML = '';
  if (!query) {
    resultsContainer.textContent = '⚠️ Please enter a customer number.';
    return;
  }

  if (!uploadedFiles.length) {
    resultsContainer.textContent = '⚠️ No files uploaded yet.';
    return;
  }

  console.log(`🔍 User searched for: ${query}`);
  announcementScroll.style.display = 'none';

  let found = false;

  for (const fileName of uploadedFiles) {
    const rows = fileData[fileName];
    console.log(`📂 Searching in file: ${fileName} (${rows.length} rows)`);

    const headers = rows[0]; // First row as header

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const match = row.some(cell => String(cell).trim() === query);
      if (match) {
        console.log("✅ Match found in row:", row);

        const outputLines = [`✅ Found in ${fileName}:`];

        for (let j = 0; j < row.length; j++) {
          const label = headers?.[j] ?? `Column ${j + 1}`;
          const val = formatCell(row[j]);
          outputLines.push(`${label}: ${val}`);
        }

        resultsContainer.innerHTML = outputLines.map(line => `<div>${line}</div>`).join('');
        found = true;
        break;
      }
    }

    if (found) break;
  }

  if (!found) {
    resultsContainer.textContent = '❌ Customer not found in any uploaded file.';
  }

  setTimeout(() => {
    resultsContainer.textContent = '';
    announcementScroll.style.display = 'inline';
  }, 15000);
});

function formatCell(cell) {
  if (typeof cell === 'number') {
    const maybeDate = excelDateToJSDate(cell);
    if (!isNaN(maybeDate) && maybeDate.getFullYear() > 2000 && maybeDate.getFullYear() < 2100) {
      return maybeDate.toLocaleDateString();
    }
  }
  return cell ?? '—';
}

function excelDateToJSDate(excelDate) {
  const msPerDay = 86400000;
  const epoch = new Date(Date.UTC(1970, 0, 1));
  return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}
