const XLSX = require("xlsx");
const fs = require("fs");

// Load the existing workbook
const workbook = XLSX.readFile(
  "INQUIRY 2024 TEMPLATE v4 pablo pablo pablo.xlsx"
);

let columnsToFill = [
  3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26,
  27, 34, 35, 41, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
];
let testArray = [];
for (let i = 1; i <= 55; i++) {
  testArray.push(`data${i}`);
}

// Select the first sheet
const sheetName = workbook.SheetNames[0];
let worksheet = workbook.Sheets[sheetName];

// Convert the worksheet to a JSON object
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log(data.length);
let emptyRow = data.length;

if (emptyRow !== -1) {
  let answerIndex = 0;
  for (let columnNumber = 1; columnNumber <= 55; columnNumber++) {
    if (columnsToFill.includes(columnNumber)) {
      // Write to cell
      const cellAddress = XLSX.utils.encode_cell({
        r: emptyRow,
        c: columnNumber - 1,
      });
      worksheet[cellAddress] = {
        t: "s", // Type 's' for string
        v: testArray[answerIndex],
      };
      answerIndex++;
    }
  }

  // Update the range of the worksheet
  if (!worksheet["!ref"]) {
    worksheet["!ref"] = XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: 0, r: emptyRow },
    });
  } else {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    range.e.r = emptyRow;
    worksheet["!ref"] = XLSX.utils.encode_range(range);
  }

  // Save the workbook
  XLSX.writeFile(workbook, "INQUIRY 2024 TEMPLATE v4 pablo.xlsx");

  console.log(`Written to row ${emptyRow}`);
} else {
  console.log("No empty row found in columns B and C");
}
