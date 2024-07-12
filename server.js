const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const { sendFileToOpenAI } = require("./sendFileToOpenAI");

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

app.use(express.static(path.join(__dirname, "public")));

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/submit", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const content = req.body.content ? JSON.parse(req.body.content) : [];
    const resultsPerDoc = req.body.resultsPerDoc;

    // Combine files and content into a single array
    const combinedItems = [
      ...files.map((file) => ({ type: "file", data: file })),
      ...content.map((item) => ({ type: "content", data: item })),
    ];
    // Process combined items
    for (const item of combinedItems) {
      //console.log(item);
      const openaiResponse = await sendFileToOpenAI(item, resultsPerDoc);
      /* console.log(
        `Item processed by OpenAI: ${
          item.type === "file" ? item.data.originalname : item.data.title
        }`
      ); */
      //console.log(openaiResponse.data);
    }

    // Handle other data as needed
    res.json({ status: "success" });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
