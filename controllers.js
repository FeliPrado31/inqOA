const path = require("path");
const fs = require("fs");

const downloadExcel = (req, res) => {
  const filePath = path.join(__dirname, "output/products.xlsx");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).send({ message: "Error al leer el archivo" });
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="Excel.xlsx"`);
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
