require("dotenv").config(); // Require dotenv configuration

const ConvertAPI = require("convertapi");
const { manageFolders } = require("./utilities");

const convertApi = new ConvertAPI(process.env.CONVERT_API_KEY);

// Set the PDF file path
let pdfFilePath = "path/to/your/file.pdf";

// Convert the PDF to images
async function getImages(filename) {
  console.log("extracting images from", filename);
  await manageFolders(["images"]);
  filename = filename.trim().replaceAll("\\", "/");
  pdfFilePath = `./${filename}`;

  try {
    const result = await convertApi.convert(
      "extract-images",
      {
        File: pdfFilePath,
        ImageFormat: "jpg",
      },
      "pdf"
    );
    await result.saveFiles("./images");
    await result.saveFiles("./imageVault");
  } catch (error) {
    console.error("Error extracting images:", error.response);
  }
}

module.exports = {
  getImages,
};
