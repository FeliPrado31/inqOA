const xlsx = require("xlsx");
const fs = require("fs");

async function writeOutputToExcel(responseArray, res) {
  // Process the data
  const processedData = await processData(responseArray);

  // Read the existing workbook
  const filePath = "./INQUIRY 2024 TEMPLATE v4.xlsx";
  const workbook = xlsx.readFile(filePath);

  // Get the first sheet or create a new one if it doesn't exist
  const sheetName = workbook.SheetNames[0];
  let worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    worksheet = xlsx.utils.json_to_sheet([]);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // Convert processedData to a worksheet
  const newDataSheet = xlsx.utils.json_to_sheet(processedData);

  // Get the range of the existing data and the new data
  const range = xlsx.utils.decode_range(worksheet["!ref"]);
  const newDataRange = xlsx.utils.decode_range(newDataSheet["!ref"]);

  // Set the starting row for the new data
  const startRow = 6;

  // Insert the new data starting from row 6
  for (let row = 0; row <= newDataRange.e.r; row++) {
    for (let col = newDataRange.s.c; col <= newDataRange.e.c; col++) {
      const newCellAddress = xlsx.utils.encode_cell({ r: row, c: col });
      const newCell = newDataSheet[newCellAddress];
      if (newCell) {
        const targetCellAddress = xlsx.utils.encode_cell({
          r: startRow + row - 1,
          c: col,
        });
        worksheet[targetCellAddress] = {
          ...newCell,
          t: newCell.t,
          v: newCell.v,
          w: newCell.w,
        };
      }
    }
  }

  // Update the worksheet range
  range.e.r = Math.max(range.e.r, startRow + newDataRange.e.r - 1);
  worksheet["!ref"] = xlsx.utils.encode_range(range);

  // Write the workbook back to the file
  await xlsx.writeFile(workbook, filePath);

  setTimeout(() => {}, 5000);

  await res.json({ success: true, redirectUrl: "/download" });
}
