let uploadedFiles = [];
let fileData = {}; // { filename: data[] }

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-uploader');
  const uploadButton = document.getElementById('upload-button');
  const filesList = document.getElementById('uploaded-files-list');

  // Handle Add Files button
  uploadButton.addEventListener('click', () => {
    const files = fileInput.files;

    if (!files.length) {
      alert('Please select at least one file.');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const fileName = files[i].name;
      if (!uploadedFiles.includes(fileName)) {
        uploadedFiles.push(fileName);
        readExcelFile(files[i]);
      } else {
        alert(`⚠️ File "${fileName}" is already uploaded.`);
      }
    }

    updateFileList();
    fileInput.value = ''; // Reset input
  });

  // Update file list UI
  function updateFileList() {
    filesList.innerHTML = '';
    uploadedFiles.forEach((fileName, i) => {
      const row = document.createElement('div');
      row.className = 'uploaded-file-row';
      row.innerText = `${i + 1}. ${fileName}`;
      filesList.appendChild(row);
    });
  }

  // Parse Excel/CSV file
  function readExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        let allRows = [];

        workbook.SheetNames.forEach(sheetName => {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
          allRows = allRows.concat(rows);
        });

        fileData[file.name] = allRows;
        console.log(`✅ Parsed "${file.name}" with ${allRows.length} rows`);
      } catch (err) {
        console.error(`❌ Failed to parse "${file.name}"`, err);
      }
    };
    reader.readAsArrayBuffer(file);
  }
});
