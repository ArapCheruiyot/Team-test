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





