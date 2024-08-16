const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const { setTimeout } = require("timers");
const xlsx = require("xlsx");
const ExcelJS = require("exceljs");

// Function to save the file buffer to the uploads directory
async function saveFileToUploads(client, file) {
    const key = `uploads:${file.originalname}`;
    await client.set(key, file.buffer);
    console.log(`File saved to Redis with key ${key}`);
}

async function saveFileToFiles(client, file) {
    const key = `files:${file.originalname}`;
    await client.set(key, file.buffer);
    console.log(`File saved to Redis with key ${key}`);
}

async function savePrevFileToExcelBase(client, file) {
    const key = `excelBase:addInfoToThis.xlsx`;
    await client.set(key, file.buffer);
    console.log(`File saved to Redis with key ${key}`);
}


async function writeOutputToExcel(client, responseArray, res, projectName, userId) {
    // Process the data
    const processedData = await processData(responseArray);

    // Select starting workbook
    let startingFiles = await client.keys(`excelBase:${userId}:*`);
    console.log("starting files:", startingFiles.length);

    const filePath =
        startingFiles.length === 1
            ? startingFiles[0]
            : `excelBase:${userId}:addInfoToThis.xlsx`;

    const workbookBuffer = await client.get(filePath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer);

    // Get the first sheet
    const sheetName = workbook.worksheets[0].name;
    const worksheet = workbook.getWorksheet(sheetName);
    // Add project id
    worksheet.getCell("H1").value = projectName;

    // Define the starting row for the new data
    let startRow = 1;
    let isRowEmpty = false;

    while (!isRowEmpty) {
        isRowEmpty = true;
        const row = worksheet.getRow(startRow);

        for (let col = 1; col <= worksheet.columnCount; col++) {
            const cell = row.getCell(col);
            if (cell.value !== null && !cell.formula) {
                isRowEmpty = false;
                break;
            }
        }

        if (!isRowEmpty) {
            startRow++;
        }
    }

    let columnsToFill = [
        3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
        25, 26, 27, 41, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
    ];

    processedData.forEach((rowData, index) => {
        console.log("start row en for each util108", startRow);

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

    // Hide columns
    let hiddenCols = [
        "AC",
        "AD",
        "AE",
        "AF",
        "AG",
        "AJ",
        "AK",
        "AL",
        "AM",
        "AN",
        "AP",
        "AQ",
        "AR",
        "AS",
    ];

    for (col of hiddenCols) {
        let colToHide = worksheet.getColumn(col);
        colToHide.hidden = true;
    }

    // Write the workbook back to Redis
    const outputBuffer = await workbook.xlsx.writeBuffer();
    const outputKey = `output:${userId}:${projectName}${Date.now()}.xlsx`;
    await client.set(outputKey, outputBuffer);

    setTimeout(() => { }, 5000);

    await res.json({ success: true, redirectUrl: "/download" });
}

//DELETE ALL FILES IN FOLDER
async function deleteAllFilesInDir(client, prefix) {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length > 0) {
        await client.del(keys);
        console.log(`Deleted keys: ${keys.join(', ')}`);
    }
}


async function deleteOneFile(client, key) {
    await client.del(key);
    console.log(`File with key ${key} deleted from Redis`);
}

//DELETE FOLDER
async function deleteFolder(client, prefix) {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length > 0) {
        await client.del(keys);
        console.log(`Deleted keys: ${keys.join(', ')}`);
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
    savePrevFileToExcelBase,
    deleteOneFile,
};
