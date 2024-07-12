const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();
const FormData = require("form-data");

const apiKey = process.env.OPENAI_API_KEY;

const app = express();
const upload = multer({ dest: "uploads/" });

// Function to upload the file to OpenAI and get the file ID
const uploadFileToOpenAI = async (filePath) => {
  const form = new FormData();
  form.append(
    "file",
    fs.createReadStream(
      "Quotation Sheet-Jinxian ANT Sporting Products Co.,Ltd 2023.11.9_20231109142619.pdf"
    )
  );
  form.append("purpose", "user_data");

  const response = await axios.post("https://api.openai.com/v1/files", form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return response.data.id;
};

// Function to query OpenAI API with file content and question
const queryOpenAIAssistantWithContent = async (content, question) => {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: `Document content: ${content}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: 150,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log(response.data.choices[0].message.content.trim());
  return response.data.choices[0].message.content.trim();
};

// Route to handle file upload and processing
app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const question = req.body.question;

  try {
    const result = await queryOpenAIAssistantWithContent(file.path, question);

    // Remove the uploaded file after processing
    fs.unlinkSync(file.path);

    res.json({ answer: result });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while processing the file.");
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function runner() {
  let id = await uploadFileToOpenAI();

  queryOpenAIAssistantWithContent(id, "transcript of document");
}
runner();
