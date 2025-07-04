let uploadedFiles = [];       // List of file names
let fileData = {};            // Actual parsed content

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const filesList = document.getElementById('uploaded-files-list');
  const addBtn = document.getElementById('add-files-btn');

  // 🟢 Update the list display
  function updateFileList() {
    filesList.innerHTML = '';
    uploadedFiles.forEach((fileName, index) => {
      const row = document.createElement('div');
      row.className = 'uploaded-file-row';
      row.innerHTML = `
        <span>${index + 1}. ${fileName}</span>
        <button class="delete-btn" data-index="${index}" style="margin-left: 10px;">🗑️ Delete</button>
      `;
      filesList.appendChild(row);
    });
  }

  // 📥 Read & parse Excel or CSV file
  function readExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      let allRows = [];

      workbook.SheetNames.forEach(sheetName => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        allRows = allRows.concat(rows);
      });

      fileData[file.name] = allRows;
      console.log(`✅ Parsed "${file.name}" with ${allRows.length} rows.`);
    };
    reader.readAsArrayBuffer(file);
  }

  // ➕ Add selected files when button is clicked
  addBtn?.addEventListener('click', () => {
    const selectedFiles = fileInput.files;
    if (selectedFiles.length === 0) {
      alert('Please select at least one Excel or CSV file.');
      return;
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileName = file.name;

      if (!uploadedFiles.includes(fileName)) {
        uploadedFiles.push(fileName);
        readExcelFile(file);
      } else {
        alert(`⚠️ File "${fileName}" is already uploaded.`);
      }
    }

    updateFileList();
    fileInput.value = ''; // Reset input
  });

  // 🗑️ Delete files
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      const fileName = uploadedFiles[index];

      uploadedFiles.splice(index, 1);
      delete fileData[fileName];

      console.log(`🗑️ Deleted "${fileName}"`);
      updateFileList();
    }
  });
});
