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

  // 📁 Attach event listener to Add Files button
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
    fileInput.value = ''; // reset
  });

  // 🧾 List uploaded files
  function updateFileList() {
    filesList.innerHTML = '<strong>Uploaded Files:</strong><br>';
    uploadedFiles.forEach((fileName, index) => {
      const div = document.createElement('div');
      div.textContent = `${index + 1}. ${fileName}`;
      filesList.appendChild(div);
    });
  }

  // 📖 Read Excel File using SheetJS
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

// 🔍 Offer Search Handler
document.getElementById('offer-search-btn').addEventListener('click', () => {
  const query = document.getElementById('offer-search-input').value.trim();
  const resultsContainer = document.getElementById('search-results');
  const announcementScroll = document.getElementById('announcement-text-scroll');

  resultsContainer.innerHTML = ''; // clear previous results

  if (!query) {
    resultsContainer.innerHTML = '<p style="color:red;">⚠️ Please enter a customer number.</p>';
    return;
  }

  if (!uploadedFiles.length) {
    resultsContainer.innerHTML = '<p style="color:red;">⚠️ No files uploaded yet.</p>';
    return;
  }

  console.log(`🔍 User searched for: ${query}`);
  announcementScroll.style.display = 'none'; // 🔕 Hide announcement scroll

  let found = false;

  for (const fileName of uploadedFiles) {
    const rows = fileData[fileName];
    console.log(`📂 Searching in file: ${fileName} (${rows.length} rows)`);

    for (const row of rows) {
      const match = Array.isArray(row) && row.some(cell => String(cell).trim() === query);
      if (match) {
        console.log("✅ Match found in row:", row);

        const formattedRow = row.map(cell => {
          if (typeof cell === 'number' && cell > 25568) {
            const date = excelDateToJSDate(cell);
            return date.toLocaleDateString();
          }
          return cell ?? '—';
        });

        const display = formattedRow.map(cell => `<span style="padding:2px 6px; display:inline-block;">${cell}</span>`).join(' <span style="color:#ccc;">|</span> ');

        resultsContainer.innerHTML = `
          <div style="background:#e7f4e4; border:2px solid #28a745; margin:12px 0; padding:10px; font-family:Arial; border-radius:4px;">
            <strong>✅ Found in:</strong> <span style="color:#1e88e5;">${fileName}</span><br/>
            <div style="margin-top:6px; font-size:14px;">${display}</div>
          </div>
        `;
        found = true;
        break;
      }
    }

    if (found) break;
  }

  if (!found) {
    resultsContainer.innerHTML = `
      <div style="background:#f8d7da; border:1px solid #f5c6cb; padding:6px; border-radius:4px;">
        ❌ Customer not found in any uploaded file.
      </div>
    `;
  }

  // ⏳ Auto-restore announcement after 15 seconds
  setTimeout(() => {
    resultsContainer.innerHTML = '';
    announcementScroll.style.display = 'inline'; // 🔁 Restore scroll
  }, 15000);
});

// 📆 Convert Excel date to JS date
function excelDateToJSDate(excelDate) {
  const msPerDay = 86400000;
  const epoch = new Date(Date.UTC(1970, 0, 1));
  return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}
