const JSZip = require("jszip");
const fs = require("fs");
const path = require("path");

// Path to the input XLSX file
const inputFilePath = "Excel (1).xlsx";
// Directory to save extracted images
const outputDir = "./images";

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function extractImageExcel(pathToExcel) {
  console.log("empieza extract");
  try {
    // Load the XLSX file as a ZIP archive
    const fileData = await fs.readFileSync(pathToExcel);
    await JSZip.loadAsync(fileData)
      .then((zip) => {
        // Filter and extract image files
        Object.keys(zip.files)
          .filter((filename) => filename.startsWith("xl/media/"))
          .forEach((filename) => {
            const file = zip.file(filename);
            if (file) {
              file
                .async("nodebuffer")
                .then((data) => {
                  const imagePath = path.join(
                    outputDir,
                    `${timestamp}+path.basename(filename)`
                  );
                  const timestamp = Date.now();

                  fs.writeFileSync(`./images/${path.basename(filename)}`, data);
                  fs.writeFileSync(
                    `./imageVault/${path.basename(filename)}`,
                    data
                  );
                  console.log(`Extracted: ${imagePath}`);
                })
                .catch(console.error);
            }
          });
      })
      .catch(console.error);
  } catch (error) {
    console.log(error);
  }
}
module.exports = {
  extractImageExcel,
};
