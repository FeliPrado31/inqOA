import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to save the file buffer to the uploads directory
export async function saveFileToUploads(file) {
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

import xlsx from "xlsx";

export async function writeOutputToExcel(responseArray) {
  // Process the data
  const processedData = await processData(responseArray);
  console.log("processedData", processedData);

  // Create a new workbook and sheet
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(processedData);

  // Add the sheet to the workbook
  xlsx.utils.book_append_sheet(workbook, worksheet, "Products");

  // Write the workbook to a file
  xlsx.writeFile(workbook, "./output/products.xlsx");
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

console.log("Excel file created successfully!");
