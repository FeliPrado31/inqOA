const XLSX = require("xlsx");
const { dirname } = require("path");
const fs = require("fs");

async function excelToHTML(file) {
  return "table.html";
  const workbook = XLSX.readFile(`${__dirname}/${file}`);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  let data = [];
  for (let row = range.s.r; row <= range.s.r + 100; row++) {
    data[row] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      let cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
      data[row].push(cell ? cell.v : "");
    }
  }

  data = data.filter((row) => row.some((cell) => cell !== ""));

  let htmlTable = `<table border="1">`;
  // Add data rows
  for (let row of data) {
    htmlTable += "<tr>";
    for (let cell of row) {
      htmlTable += `<td>${cell}</td>`;
    }
    htmlTable += "</tr>";
  }

  htmlTable += "</table>";
  await fs.writeFileSync("table.html", htmlTable, () =>
    console.log("xlsx converted to html")
  );
  return "table.html";
}

module.exports = {
  excelToHTML,
};
