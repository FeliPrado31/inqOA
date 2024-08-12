const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
require("dotenv").config(); // Require dotenv configuration
const routes = require("./routes");
const ejs = require("ejs");

const OpenAI = require("openai");
const {
  deleteFolder,
  saveFileToUploads,
  writeOutputToExcel,
  manageFolders,
  saveFileToFiles,
  savePrevFileToExcelBase,
  deleteOneFile,
} = require("./utilities.js");
const { processUploadedFile } = require("./assistantTest2.js");
const { getImages } = require("./extractImages.js");
const { replaceImages } = require("./replaceImages.js");
const { extractImageExcel } = require("./extractImageExcel.js");
const openai = new OpenAI();

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
let processedData;
let responsesArray = [];
const folders = ["images", "uploads", "output", "imageVault", "files"];

app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use("/", routes());

app.use(express.static(path.join(__dirname, "public")));

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post(
  "/submit",
  upload.fields([{ name: "files" }, { name: "previousFiles" }]),
  async (req, res) => {
    responsesArray = [];
    let filesReceived = [];
    let inputsReceived = [];
    const contentArray = req.body.content;
    const files = req.files["files"] || [];
    const previousFiles = req.files["previousFiles"] || [];
    console.log("body:", contentArray);
    try {
      await deleteOneFile("./excelBase/addInfoToThis.xlsx");

      if (previousFiles.length > 0) {
        let file = previousFiles[0];
        let fileContent = file.buffer;

        if (
          file.mimetype === "application/vnd.ms-excel" ||
          file.mimetype ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          await savePrevFileToExcelBase(file);
        }
      }

      await processEachFile();

      if (contentArray && contentArray.length > 0) {
        console.log("CONTENT");
        await processInputContent();
      }

      console.log("responsesArray", responsesArray);
      await writeOutputToExcel(responsesArray, res, req.body.projectName);
      await replaceImages();
    } catch (error) {
      console.error("Error during /submit process:", error);
      res.json({
        success: true,
        redirectUrl: "/error",
        message: "An error occurred during the process.",
      });
      //res.status(500).send("An error occurred during the process.");
      return; // Stops further execution of the route
    }

    async function processEachFile() {
      await manageFolders(folders);

      for (const file of files) {
        console.log(`comienza proceso de file ${file.originalname}`);
        console.log("file:", file);
        let fileContent = file.buffer;
        let filePath = null;

        if (
          file.mimetype === "application/vnd.ms-excel" ||
          file.mimetype ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          try {
            await saveFileToFiles(file);
            await manageFolders(["images"]);
            let excelPath = `./files/${file.originalname}`;
            await extractImageExcel(excelPath);

            const workbook = xlsx.read(file.buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            const trimmedData = data.slice(0, 100);
            const trimmedWorksheet = xlsx.utils.aoa_to_sheet(trimmedData);
            const fileContent = xlsx.utils.sheet_to_html(trimmedWorksheet);

            filePath = path.join(
              __dirname,
              "uploads",
              `${file.originalname}.html`
            );
            fs.writeFileSync(filePath, fileContent);

            let openaiResponse = await processUploadedFile(
              filePath,
              req.body.resultsPerDoc,
              req.body.inquiry,
              res
            );
            await handleImages(openaiResponse);

            responsesArray.push(openaiResponse);
          } catch (error) {
            console.error(`Error processing file ${file.originalname}:`, error);
            throw error; // Propagate error to stop execution
          }
        } else {
          try {
            await saveFileToUploads(file);
            filePath = `./uploads/${file.originalname}`;

            if (filePath.includes(".pdf")) {
              await getImages(filePath);
            }

            let openaiResponse = await processUploadedFile(
              filePath,
              req.body.resultsPerDoc,
              req.body.inquiry,
              res
            );
            await handleImages(openaiResponse);

            responsesArray.push(openaiResponse);
          } catch (error) {
            console.error(
              `Error processing non-Excel file ${file.originalname}:`,
              error
            );
            throw error; // Propagate error to stop execution
          }
        }
      }
    }

    async function processInputContent() {
      for (let contentObj of contentArray) {
        try {
          const contentText = `Provider name: ${contentObj.title}\n${contentObj.content}`;
          const contentFilePath = path.join(
            __dirname,
            "uploads",
            `${contentObj.title}.txt`
          );
          fs.writeFileSync(contentFilePath, contentText);

          let openaiResponse = await processUploadedFile(
            contentFilePath,
            req.body.resultsPerDoc,
            req.body.inquiry,
            res
          );
          responsesArray.push(openaiResponse);
        } catch (error) {
          console.error("Error processing input content:", error);
          throw error; // Propagate error to stop execution
        }
      }
    }

    async function handleImages(openaiResponse) {
      try {
        let imagesList = await fs.readdirSync("./images");
        for (let i = 1; i <= imagesList.length; i++) {
          if (i === 1) {
            openaiResponse.openaiResponse =
              openaiResponse.openaiResponse.replace(
                `"PRODUCT REAL PICTURES": "NF"`,
                `"PRODUCT REAL PICTURES":"${imagesList[i - 1]}"`
              );
            openaiResponse.openaiResponse =
              openaiResponse.openaiResponse.replace(
                `"PRODUCT REAL PICTURES":"NF"`,
                `"PRODUCT REAL PICTURES":"${imagesList[i - 1]}"`
              );
          }
          openaiResponse.openaiResponse = openaiResponse.openaiResponse.replace(
            `"IMAGE ${i}": "NF"`,
            `"IMAGE ${i}":"${imagesList[i - 1]}"`
          );
          openaiResponse.openaiResponse = openaiResponse.openaiResponse.replace(
            `"IMAGE ${i}":"NF"`,
            `"IMAGE ${i}":"${imagesList[i - 1]}"`
          );
        }
        console.log("con imagenes: ", openaiResponse);
      } catch (error) {
        console.error("Error handling images:", error);
        throw error; // Propagate error to stop execution
      }
    }
  }
);

app.get("/download", (req, res) => {
  console.log("download is being hit");
  res.render("download.ejs");
});

app.get("/error", (req, res) => {
  console.log("ERROR ROUTE");

  res.status(500).render("error.ejs");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
