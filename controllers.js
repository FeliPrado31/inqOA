const path = require("path");
const fs = require("fs");
const { getLastModifiedFile } = require("./lastFile.js");

const downloadExcel = async (req, res) => {
  //check if theres output with images
  let fileToDownload = await getLastModifiedFile("./output");

  await fs.readFile(fileToDownload, (err, data) => {
    if (err) {
      res.status(500).send({ message: "Error al leer el archivo" });
    } else {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileToDownload}`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(data);
    }
  });
};
module.exports = {
  downloadExcel,
};
