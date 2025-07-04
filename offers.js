let uploadedFiles = [];
let fileData = {};

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const addBtn = document.getElementById('add-files-btn');
  const filesList = document.getElementById('uploaded-files-list');

  // ✅ Update file list UI
  function updateFileList() {
    filesList.innerHTML = '';
    uploadedFiles.forEach((fileName, index) => {
      const row = document.createElement('div');
      row.className = 'uploaded-file-row';
      row.innerHTML = `
        <span>${index + 1}. ${fileName}</span>
        <button class="delete-btn" data-index="${index}">🗑️ Delete</button>
      `;
      filesList.appendChild(row);
    });
  }

  // ✅ Parse Excel file
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
      console.log(`✅ Parsed ${file.name} (${allRows.length} rows)`);
    };
    reader.readAsArrayBuffer(file);
  }

  // ✅ Handle Add Files Button
  addBtn.addEventListener('click', () => {
    console.log('➕ Add Files button clicked');
    const selectedFiles = fileInput.files;

    if (!selectedFiles.length) {
      alert('Please select at least one file.');
      return;
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileName = file.name;

      if (!uploadedFiles.includes(fileName)) {
        uploadedFiles.push(fileName);
        readExcelFile(file);
      } else {
        alert(`⚠️ File "${fileName}" already added.`);
      }
    }

    updateFileList();
    fileInput.value = ''; // Clear input
  });

  // ✅ Handle Delete Button
  filesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      const fileName = uploadedFiles[index];

      uploadedFiles.splice(index, 1);
      delete fileData[fileName];
      console.log(`🗑️ Deleted ${fileName}`);

      updateFileList();
    }
  });
});
