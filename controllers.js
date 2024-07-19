const path = require("path");
const fs = require("fs");

const downloadExcel = async (req, res) => {
  //check if theres output with images
  let imagesList = await fs.readdirSync("./output");
  console.log("archivos en output: ", imagesList);
  let xlsxPath = imagesList.includes("products_with_images.xlsx")
    ? "products_with_images.xlsx"
    : "products.xlsx";

  const filePath = path.join(__dirname, `output/${xlsxPath}`);
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
