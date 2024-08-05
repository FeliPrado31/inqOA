document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const previousFileInput = document.getElementById("previous-file-input");
  const dropArea = document.getElementById("drop-area");
  const previousDropArea = document.getElementById("previous-drop-area");
  const contentForm = document.getElementById("content-form");
  const fileList = document.getElementById("file-list");
  const previousFileList = document.getElementById("previous-file-list");
  const contentListDiv = document.getElementById("content-list");
  const finalSubmitButton = document.getElementById("final-submit");

  let section1 = [];
  let section2 = [];
  let previousFile = [];

  // Handle file upload via input
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  previousFileInput.addEventListener("change", (e) => {
    handlePreviousFiles(e.target.files);
  });

  // Handle drag and drop file upload
  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });
  ///////
  previousDropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    previousDropArea.classList.add("dragover");
  });

  previousDropArea.addEventListener("dragleave", () => {
    previousDropArea.classList.remove("dragover");
  });

  previousDropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    previousDropArea.classList.remove("dragover");
    handlePreviousFiles(e.dataTransfer.files);
  });
  ///////

  function handleFiles(files) {
    for (const file of files) {
      section1.push(file);
      const fileItem = document.createElement("div");
      fileItem.textContent = file.name;
      fileList.appendChild(fileItem);
    }
  }
  function handlePreviousFiles(files) {
    for (const file of files) {
      previousFile.push(file);
      const fileItem = document.createElement("div");
      fileItem.textContent = file.name;
      previousFileList.appendChild(fileItem);
    }
  }

  // Handle content form submission
  contentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("title-input").value;
    const content = document.getElementById("content-input").value;
    if (title && content) {
      section2.push({ title, content });
      const contentItem = document.createElement("div");
      contentItem.textContent = title;
      contentListDiv.appendChild(contentItem);
      contentForm.reset();
    }
  });

  // Handle final submission
  finalSubmitButton.addEventListener("click", () => {
    document.querySelector(".spinnerContainer").style.display = "block";

    console.log(section2);
    console.log(section1);
    let projectName = document.getElementById("projectName-input").value;

    if (projectName === "") {
      projectName = "sin_nombre_asignado";
    }

    const inquiryInput = document.getElementById("inquiry-input").value;
    const data = new FormData();
    section1.forEach((file, index) => {
      data.append("files", file, file.name);
    });
    section2.forEach((content, index) => {
      data.append(`content[${index}][title]`, content.title);
      data.append(`content[${index}][content]`, content.content);
    });
    data.append("projectName", projectName);
    data.append("inquiry", inquiryInput);
    console.log(data);
    // Send data to backend (example using fetch)
    fetch("/submit", {
      method: "POST",
      body: data,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data.redirectUrl);
        if (data.success) {
          window.location.href = data.redirectUrl;
        } else {
          console.error("Failed to process the submission");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
});
