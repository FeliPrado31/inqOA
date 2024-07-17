const xl = require("excel4node");

export async function convertToExcel(data) {
  if (!data) return;
  var wb = new xl.Workbook();

  // Add Worksheets to the workbook
  var ws = wb.addWorksheet("Sheet 1");
  let rowCounter = 1;

  const arrayName = Object.keys(data)[0];
  const dataArray = data[arrayName];
  const tableHeaders = Object.keys(dataArray[0]);

  //* console.log(dataArray);

  // Create a reusable style
  var style = wb.createStyle({
    font: {
      color: "#000000",
      size: 12,
    },
    alignment: { wrapText: true },
    numberFormat: "@",
  });

  for (let h = 0; h < tableHeaders.length; h++) {
    ws.column(h + 1).setWidth(tableHeaders[h].length + 3);
    ws.cell(rowCounter, h + 1).string(tableHeaders[h]);
  }
  ws.row(1).filter();
  rowCounter++;

  await dataArray.forEach((entry) => {
    for (let h = 0; h < tableHeaders.length; h++) {
      let cellContent = entry[tableHeaders[h]].replace(/[$,]/g, "");
      if (cellContent.includes(".jpg")) {
        ws.addImage({
          path: `${cellContent}`,
          type: "picture",
          position: {
            type: "oneCellAnchor",
            from: {
              col: h + 1,
              colOff: 0,
              row: rowCounter,
              rowOff: 0,
            },
          },
        });
      } else {
        ws.cell(rowCounter, h + 1)
          .string(cellContent)
          .style(style);
      }
    }
    rowCounter++;
  });

  console.log("escribe excel");

  wb.write(`.?output/Excel.xlsx`);

  return `Excel.xlsx`;
}
