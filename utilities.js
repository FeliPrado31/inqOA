const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const { setTimeout } = require("timers");
const xlsx = require("xlsx");
const ExcelJS = require("exceljs");

// Function to save the file buffer to the uploads directory
async function saveFileToUploads(file) {
  const uploadsDir = path.join(__dirname, "uploads");

  // Ensure the uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  // Construct the full path for the file
  const filePath = path.join(uploadsDir, file.originalname);

  // Write the file buffer to the uploads directory
  await fs.writeFileSync(filePath, file.buffer);

  console.log(`File saved to ${filePath}`);
}

async function saveFileToFiles(file) {
  console.log("saving file");
  const uploadsDir = path.join(__dirname, "files");

  // Ensure the uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  // Construct the full path for the file
  const filePath = path.join(uploadsDir, file.originalname);

  // Write the file buffer to the uploads directory
  await fs.writeFileSync(filePath, file.buffer);

  console.log(`File saved to ${filePath}`);
}

async function writeOutputToExcel(responseArray, res, projectName) {
  // Process the data
  const processedData = await processData(responseArray);

  // Read the existing workbook
  const filePath = "./INQUIRY 2024 TEMPLATE v4 pablo.xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Get the first sheet
  const sheetName = workbook.worksheets[0].name;
  const worksheet = workbook.getWorksheet(sheetName);

  /* worksheet.getCell("H1").value = projectName;
  for (let im = 1; im <= 7; im++) {
    let row = 5;
    let col = 45 + im;
    worksheet.getCell().value = `IMAGE ${im}`;
  }
  // Define the starting row for the new data */
  const startRow = 6;

  let columnsToFill = [
    3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25,
    26, 27, 41, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
  ];
  processedData.forEach((rowData, index) => {
    const row = worksheet.getRow(startRow + index);
    let dataIndex = 0;

    columnsToFill.forEach((colIndex) => {
      if (dataIndex < Object.keys(rowData).length) {
        const cell = row.getCell(colIndex);
        // Check if the cell contains a formula
        if (!cell.formula) {
          cell.value = rowData[Object.keys(rowData)[dataIndex]];
          dataIndex++;
        } else {
          // Handle shared formulas by copying the formula from the master cell
          const masterCell = worksheet.getCell(startRow + index - 1, colIndex);
          if (masterCell.formula) {
            cell.formula = masterCell.formula;
          }
        }
      }
    });

    row.commit();
  });

  // Preserve column widths
  const columnWidths = worksheet.columns.map((col) => col.width);
  worksheet.columns.forEach((col, index) => {
    col.width = columnWidths[index];
  });

  // Write the workbook back to the file
  var d = new Date();
  d = d.getTime().toString();
  await workbook.xlsx.writeFile(`./output/${projectName}${d}.xlsx`);

  setTimeout(() => {}, 5000);

  await res.json({ success: true, redirectUrl: "/download" });
}

//DELETE ALL FILES IN FOLDER
async function deleteAllFilesInDir(dirPath) {
  try {
    console.log("deleting ", dirPath);
    fs.readdirSync(dirPath).forEach((file) => {
      console.log("deleting", `${dirPath}${file}`);
      fs.rmSync(path.join(dirPath, file));
    });
  } catch (error) {
    console.log(error);
  }
}

//DELETE FOLDER
async function deleteFolder(folder) {
  const directoryPath = path.resolve(__dirname, folder);

  // Check if the directory exists
  if (fs.existsSync(directoryPath)) {
    // Delete the directory if it exists
    try {
      fs.rmSync(directoryPath, { recursive: true });
      console.log(`${directoryPath} is deleted!`);
    } catch (err) {
      console.error(`Error while deleting ${directoryPath}.`, err);
    }
  } else {
    console.log(`${directoryPath} does not exist.`);
  }
}

// Function to process the data
async function processData(responseArray) {
  let allData = [];

  responseArray.forEach((item) => {
    // Remove any content after the closing bracket '}]' but keep the closing single quote
    const regex = /【[^【】]*】/g;
    let cleanedResponse = item.openaiResponse.replace(regex, "");
    // Parse the JSON data
    let jsonData = JSON.parse(cleanedResponse);
    allData = allData.concat(jsonData);
  });

  return allData;
}

async function manageFolders(folders) {
  for (const folderName of folders) {
    const folderPath = path.resolve(__dirname, folderName);

    try {
      // Check if the folder exists
      await fsPromises.access(folderPath);
      // If it exists, delete it
      await fsPromises.rm(folderPath, { recursive: true });
      console.log(`Deleted folder: ${folderPath}`);
    } catch (error) {
      // If it doesn't exist, ignore the error
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    // Create the folder
    await fsPromises.mkdir(folderPath);
    console.log(`Created folder: ${folderPath}`);
  }
}

module.exports = {
  deleteAllFilesInDir,
  deleteFolder,
  saveFileToUploads,
  writeOutputToExcel,
  processData,
  manageFolders,
  saveFileToFiles,
};
