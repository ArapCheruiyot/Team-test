let uploadedFiles = [];
let fileData = {}; // { filename: [data] }

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const addButton = document.getElementById('upload-button');
  const filesList = document.getElementById('uploaded-files-list');

  addButton.addEventListener('click', () => {
    const files = fileInput.files;

    if (!files.length) {
      alert('Please select at least one file.');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;

      if (!uploadedFiles.includes(fileName)) {
        uploadedFiles.push(fileName);
        readExcelFile(file); // Parse the file
      } else {
        alert(`File "${fileName}" is already uploaded.`);
      }
    }

    updateFileList();
    fileInput.value = ''; // Clear input after adding
  });

  // 🗑️ Handle delete clicks
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const name = e.target.getAttribute('data-name');
      uploadedFiles = uploadedFiles.filter(f => f !== name);
      delete fileData[name];
      updateFileList();
      console.log(`🗑️ Deleted file: ${name}`);
    }
  });

  function updateFileList() {
    filesList.innerHTML = '';
    if (uploadedFiles.length === 0) {
      filesList.innerHTML = '<p>No files uploaded yet.</p>';
      return;
    }

    uploadedFiles.forEach((name, index) => {
      const row = document.createElement('div');
      row.classList.add('file-row');
      row.innerHTML = `
        <span>${index + 1}. ${name}</span>
        <button class="delete-btn" data-name="${name}" style="margin-left: 10px;">🗑️ Delete</button>
      `;
      filesList.appendChild(row);
    });
  }

  function readExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        let allData = [];

        workbook.SheetNames.forEach(sheetName => {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
          allData = allData.concat(rows);
        });

        fileData[file.name] = allData;
        console.log(`✅ Parsed "${file.name}" with ${allData.length} rows`);
      } catch (err) {
        console.error(`❌ Error reading "${file.name}"`, err);
      }
    };
    reader.readAsArrayBuffer(file);
  }
});





  // 🔍 Handle Offer Search
document.getElementById('offer-search-btn').addEventListener('click', () => {
  const query = document.getElementById('offer-search-input').value.trim();
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = ''; // clear old results

  if (!query) {
    resultsContainer.innerHTML = '<p style="color:red;">⚠️ Please enter a customer number.</p>';
    return;
  }

  if (!uploadedFiles.length) {
    resultsContainer.innerHTML = '<p style="color:red;">⚠️ No files uploaded yet.</p>';
    return;
  }

  let found = false;

  for (const fileName of uploadedFiles) {
    const rows = fileData[fileName];
    for (const row of rows) {
      if (Array.isArray(row) && row.some(cell => String(cell).trim() === query)) {
        const formattedRow = row.map(cell => {
          if (typeof cell === 'number' && cell > 25568) {
            const date = excelDateToJSDate(cell);
            return date.toLocaleDateString();
          }
          return cell;
        });

        const display = formattedRow.map(cell => `<span>${cell}</span>`).join(' | ');
        resultsContainer.innerHTML += `
          <div style="background:#e7f4e4; border:1px solid #d6e9c6; margin-bottom:8px; padding:6px;">
            ✅ Found in <strong>${fileName}</strong>: ${display}
          </div>
        `;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    resultsContainer.innerHTML = '<div style="background:#f8d7da; border:1px solid #f5c6cb; padding:6px;">❌ Customer not found in any file.</div>';
  }
});

// 📆 Excel Date Conversion
function excelDateToJSDate(excelDate) {
  const msPerDay = 86400000;
  const epoch = new Date(Date.UTC(1970, 0, 1));
  return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}


