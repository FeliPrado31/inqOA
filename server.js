import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import axios from "axios";
import "dotenv/config"; // Import dotenv configuration
import FormData from "form-data";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import OpenAI from "openai";
import { saveFileToUploads, writeOutputToExcel } from "./utilities.js";
import { processUploadedFile } from "./assistantTest2.js";
const openai = new OpenAI();

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
let processedData;
let responsesArray = [];

app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

app.use(express.static(path.join(__dirname, "public")));

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/submit", upload.array("files"), async (req, res) => {
  responsesArray = [];
  let filesReceived = [];
  let inputsReceived = [];
  const contentArray = req.body.content;
  //console.log("inputs", req.body.content);
  const files = req.files;
  console.log("body:", req.body);

  await processEachFile();

  async function processEachFile() {
    //save uploaded files and process them
    for (const [index, file] of files.entries()) {
      console.log(`comienza proceso de file ${file.originalname}`);
      console.log("file:", file);
      let fileContent = file.buffer;
      let filePath = null;

      // Check if the file is an Excel file
      if (
        file.mimetype === "application/vnd.ms-excel" ||
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        const workbook = xlsx.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = await workbook.Sheets[sheetName];

        // Convert the worksheet to an array of arrays (2D array)
        const data = await xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        // Trim the data to the first 100 rows
        const trimmedData = data.slice(0, 100);

        // Create a new worksheet from the trimmed data
        const trimmedWorksheet = await xlsx.utils.aoa_to_sheet(trimmedData);

        // Convert the trimmed worksheet to HTML
        const fileContent = await xlsx.utils.sheet_to_html(trimmedWorksheet);

        // Save the HTML content to a file with .html extension
        filePath = path.join(__dirname, "uploads", `${file.originalname}.html`);
        await fs.writeFileSync(filePath, fileContent);
        let openaiResponse = await processUploadedFile(
          filePath,
          req.body.resultsPerDoc,
          req.body.inquiry
        );
        console.log(openaiResponse);
        responsesArray.push(openaiResponse);
      } else {
        //save and process non xlsx files
        await saveFileToUploads(file);
        let filePath = `./uploads/${file.originalname}`;
        let openaiResponse = await processUploadedFile(
          filePath,
          req.body.resultsPerDoc,
          req.body.inquiry
        );
        responsesArray.push(openaiResponse);

        //let images = await getImages(filePath);
        //let responseWithImages = await addImagesToResponse(images);
      }
    }
  }
  // Process the content objects
  if (contentArray && contentArray.length > 0) {
    await processInputContent();
  }
  console.log(responsesArray);
  writeOutputToExcel(responsesArray);

  async function processInputContent() {
    for (let contentObj of contentArray) {
      const contentText = `Provider name: ${contentObj.title}\n${contentObj.content}`;
      const contentFilePath = path.join(
        __dirname,
        "uploads",
        `${contentObj.title}.txt`
      );
      await fs.writeFileSync(contentFilePath, contentText);
      let openaiResponse = await processUploadedFile(
        contentFilePath,
        req.body.resultsPerDoc,
        req.body.inquiry
      );
      console.log(openaiResponse);
      responsesArray.push(openaiResponse);
    }
  }
});
// Log processed data in a more readable format

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
