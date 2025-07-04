console.log("✅ offers.js loaded and DOM fully ready");

let uploadedFiles = [];
let fileData = {}; // Stores parsed data keyed by file name

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const addBtn = document.getElementById('add-files-btn');
  const filesList = document.getElementById('uploaded-files-list');

  if (!fileInput || !addBtn || !filesList) {
    console.warn("❗ Required elements not found in DOM. Aborting offers.js.");
    return;
  }

  // Attach event listener to Add Files button
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
        readExcelFile(file); // Parse and store file
      } else {
        alert(`File "${file.name}" is already uploaded.`);
      }
    }

    updateFileList();
    fileInput.value = ''; // Reset input
  });

  // Render list of uploaded files
  function updateFileList() {
    filesList.innerHTML = '<strong>Uploaded Files:</strong><br>';
    uploadedFiles.forEach((fileName, index) => {
      const div = document.createElement('div');
      div.textContent = `${index + 1}. ${fileName}`;
      filesList.appendChild(div);
    });
  }

  // Read and parse Excel file using SheetJS
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

// 📆 Excel Date Conversion
function excelDateToJSDate(excelDate) {
  const msPerDay = 86400000;
  const epoch = new Date(Date.UTC(1970, 0, 1));
  return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}

// 🔍 Handle Offer Search
document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('offer-search-btn');
  const searchInput = document.getElementById('offer-search-input');
  const resultsContainer = document.getElementById('search-results');

  if (!searchBtn || !searchInput || !resultsContainer) {
    console.warn("❗ Missing search elements in DOM.");
    return;
  }

  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim().toLowerCase();
    resultsContainer.innerHTML = ''; // Clear previous

    console.log("🔍 User searched for:", query);

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
      if (!Array.isArray(rows)) continue;

      console.log(`📂 Searching in file: ${fileName} (${rows.length} rows)`);

      for (const row of rows) {
        if (!Array.isArray(row)) continue;

        const match = row.find(cell =>
          String(cell || '').toLowerCase().trim() === query
        );

        if (match) {
          console.log("✅ Match found in row:", row);

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
      console.warn("❌ No matching customer found.");
      resultsContainer.innerHTML = `
        <div style="background:#f8d7da; border:1px solid #f5c6cb; padding:6px;">
          ❌ Customer not found in any uploaded file.
        </div>`;
    }
  });
});
