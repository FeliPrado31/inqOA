const fs = require("fs");
const pdfParse = require("pdf-parse");

let convertedText;
async function convertPdfToText(pdf) {
  const dataBuffer = fs.readFileSync(pdf);
  const data = await pdfParse(dataBuffer);
  fs.writeFile("prueba.txt", data.text, () => {
    console.log("cb");
  });

  return convertedText;
}
convertPdfToText(
  "Quotation Sheet-Jinxian ANT Sporting Products Co.,Ltd 2023.11.9_20231109142619.pdf"
);
