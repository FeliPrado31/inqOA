const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const { getLastModifiedFile } = require("./lastFile.js");

async function replaceImages() {
  // Define the directories
  const outputDir = path.join(__dirname, "output");
  const imagesDir = path.join(__dirname, "imageVault");
  let originalFile = await getLastModifiedFile("./output");
  console.log(originalFile);

  // Read the spreadsheet
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(originalFile));
  const worksheet = workbook.getWorksheet(1);

  // Function to find and replace JPEG filenames with corresponding images
  async function replaceJpegFilenamesWithImages() {
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (
          cell.value &&
          typeof cell.value === "string" &&
          (cell.value.toLowerCase().endsWith(".jpeg") ||
            cell.value.toLowerCase().endsWith(".jpg"))
        ) {
          const imagePath = path.join(imagesDir, cell.value);
          if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: "jpeg",
            });

            cell.value = "";
            worksheet.addImage(imageId, {
              tl: { col: colNumber - 1, row: rowNumber - 1 },
              ext: { width: 100, height: 100 },
            });
            row.height = 100;
            worksheet.getColumn(colNumber).width = 30;
          }
        }
      });
    });
  }

  // Replace JPEG filenames with images
  await replaceJpegFilenamesWithImages();

  // Write the updated workbook to a new file
  await workbook.xlsx.writeFile(
    originalFile.replace(/\.xlsx$/, "_revisado.xlsx")
  );

  console.log("Spreadsheet updated successfully.");
}

module.exports = { replaceImages };
