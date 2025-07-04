// offers.js — Updated: Safe DOM access + Upload logic

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
