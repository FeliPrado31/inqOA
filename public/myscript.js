// scripts.js
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const dropArea = document.getElementById("drop-area");
  const contentForm = document.getElementById("content-form");
  const submittedContent = document.getElementById("submitted-content");
  const resultsForm = document.getElementById("results-form");
  const finalSubmitButton = document.getElementById("final-submit");

  let contentList = [];
  let filesList = [];

  // Handle file upload via input
  fileInput.addEventListener("change", (e) => {
    filesList.push(...e.target.files);
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
    filesList.push(...e.dataTransfer.files);
  });

  // Handle content form submission
  contentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("title-input").value;
    const content = document.getElementById("content-input").value;
    contentList.push({ title, content });

    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = `<h4>${title}</h4><p>${content}</p>`;
    submittedContent.appendChild(contentDiv);

    contentForm.reset();
  });

  // Handle final submission
  finalSubmitButton.addEventListener("click", () => {
    const resultsInput = document.getElementById("results-input").value;
    const formData = new FormData();

    // Append files
    filesList.forEach((file) => {
      formData.append("files", file);
    });

    // Append other data
    formData.append("content", JSON.stringify(contentList));
    formData.append("resultsPerDoc", resultsInput);

    // Send data to backend (example using fetch)
    fetch("/submit", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
});
function convertFilesToSerializable(files) {
  return Array.from(files).map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  }));
}
