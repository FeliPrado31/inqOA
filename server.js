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
const folders = ["images", "uploads", "output", "imageVault"];

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
    await manageFolders(folders);

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
        await manageFolders(["images"]);
        await extractImageExcel(`./files?${file.originalname}`);
        console.log("volvio de extractimage");
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
        console.log("html resp", openaiResponse);

        // ADD IMAGES TO openAI
        try {
          let imagesList = await fs.readdirSync("./images");
          console.log("imagelist para reemplazar ", imagesList);
          for (let i = 1; i <= imagesList.length; i++) {
            console.log("reemplazar imagenes", imagesList, imagesList[i - 1]);

            openaiResponse.openaiResponse =
              await openaiResponse.openaiResponse.replace(
                `"IMAGE ${i}": "NF"`,
                `"IMAGE ${i}":"${imagesList[i - 1]}"`
              );
            openaiResponse.openaiResponse =
              await openaiResponse.openaiResponse.replace(
                `"IMAGE ${i}":"NF"`,
                `"IMAGE ${i}":"${imagesList[i - 1]}"`
              );
          }
        } catch (error) {
          console.log(error);
        }

        await console.log("con imagenes: ", openaiResponse);

        await responsesArray.push(openaiResponse);
        await manageFolders(["images"]);
      } else {
        //save and process non xlsx files
        await manageFolders(["images"]);
        await saveFileToUploads(file);
        let filePath = `./uploads/${file.originalname}`;

        //extract images
        if (filePath.includes(".pdf")) await getImages(filePath);

        //MAKE LIST OF EXTRACTED IMAGES
        let imagesList = await fs.readdirSync("./images");
        console.log("imagelist para reemplazar ", imagesList);
        //console.log("RES en server", res);
        let openaiResponse = await processUploadedFile(
          filePath,
          req.body.resultsPerDoc,
          req.body.inquiry,
          res
        );
        console.log("RESPUESTA", openaiResponse);

        // ADD IMAGES TO openAI
        for (let i = 1; i <= imagesList.length; i++) {
          console.log("reemplazar imagenes", imagesList, imagesList[i - 1]);

          openaiResponse.openaiResponse =
            await openaiResponse.openaiResponse.replace(
              `"IMAGE ${i}": "NF"`,
              `"IMAGE ${i}":"${imagesList[i - 1]}"`
            );
          openaiResponse.openaiResponse =
            await openaiResponse.openaiResponse.replace(
              `"IMAGE ${i}":"NF"`,
              `"IMAGE ${i}":"${imagesList[i - 1]}"`
            );
        }
        await console.log("con imagenes: ", openaiResponse);

        responsesArray.push(openaiResponse);
        await manageFolders(["images"]);

        //let images = await getImages(filePath);
        //let responseWithImages = await addImagesToResponse(images);
      }
    }
  }
  // Process the content objects
  if (contentArray && contentArray.length > 0) {
    await processInputContent();
  }

  console.log("responsesArray", responsesArray);

  await writeOutputToExcel(responsesArray, res);
  await replaceImages();

  async function processInputContent() {
    for (let contentObj of contentArray) {
      const contentText = `Provider name: ${contentObj.title}\n${contentObj.content}`;
      const contentFilePath = path.join(
        __dirname,
        "uploads",
        `${contentObj.title}.txt`
      );
      await fs.writeFileSync(contentFilePath, contentText);
      //console.log("RES en server", res);
      let openaiResponse = await processUploadedFile(
        contentFilePath,
        req.body.resultsPerDoc,
        req.body.inquiry,
        res
      );
      console.log(openaiResponse);
      responsesArray.push(openaiResponse);
    }
  }
});

app.get("/download", (req, res) => {
  console.log("download is being hit");
  res.render("download.ejs");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
