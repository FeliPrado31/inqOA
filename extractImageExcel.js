const JSZip = require("jszip");
const fs = require("fs");
const path = require("path");

// Directory to save extracted images
const outputDir = "./images";
const outputDir2 = "./imageVault";

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function extractImageExcel(pathToExcel) {
  await console.log("empieza extract");
  try {
    // Load the XLSX file as a ZIP archive
    const fileData = await fs.readFileSync(pathToExcel);
    await JSZip.loadAsync(fileData)
      .then((zip) => {
        // Filter and extract image files
        Object.keys(zip.files)
          .filter((filename) => filename.startsWith("xl/media/"))
          .forEach((filename) => {
            console.log("extrayendo imagen", filename);
            const file = zip.file(filename);
            if (file) {
              const timestamp = Date.now();
              file
                .async("nodebuffer")
                .then((data) => {
                  const imagePath = path.join(
                    `${timestamp}${path.basename(filename)}`
                  );

                  fs.writeFileSync(`./images/${imagePath}`, data);
                  fs.writeFileSync(`./imageVault/${imagePath}`, data);
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
