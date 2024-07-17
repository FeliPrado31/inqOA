const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config(); // Require dotenv configuration
const FormData = require("form-data");
const XLSX = require("xlsx");
const OpenAI = require("openai");
const { excelToHTML } = require("./excelToHTML.js");
const openai = new OpenAI();

const apiKey = process.env.OPENAI_API_KEY;

const vectorStoreId = process.env.VSID;
const assistantId = process.env.ASSID;

let openaiResponse;

//await processUploadedFile(filePath, req.body.resultsPerDoc, req.body.inquiry);
//let images = await getImages(filePath);
//let responseWithImages = await addImagesToResponse(images);

const tableHeaders = [
  "PROVIDER",
  "PRODUCT DESCRIPTION",
  "SUPPLIER PICTURES",
  "MATERIAL",
  "SIZES OR CAPACITY",
  "CERTIFICATE",
  "OTHER CERTIFICATE",
  "LOGO DETAILS",
  "OTHER LOGO",
  "SET UP CHARGE",
  "SAMPLE TIME",
  "PRODUCTION TIME",
  "INCOTERM",
  "QUANTITY",
  "PRICE USD",
  "PCS PER BOX",
  "L",
  "H",
  "W",
  "GW KG",
  "CODE NUMBER",
  "IMAGE 1",
  "IMAGE 2",
  "IMAGE 3",
  "IMAGE 4",
  "IMAGE 5",
  "IMAGE 6",
  "IMAGE 7",
  "IMAGE 8",
  "IMAGE 9",
  "IMAGE 10",
];
const question0 = `This is the question we asked our providers: `;
const question = `
Based on the info in your vectorstore.
I need you to find the relevant information and give it back to me as an array of JSON objects, with one json (without extra formatting) object per price with the following attributes:    `;
const question2 = `For the attribute incoterm if there is separated data for exw and fob its value should be "exw/fob".If you can't find an attribute's value, define it as NF. Make a different object for each price. Dont wrap this array in a json object. All atributes should be enclosed in single quotation marks. Don't add any other text besides the array of json objects. If you can't find an attribute's value, define it as 'NF'. Convert all time indications to days (examples: 72hours=3 days; 2 weeks=14 days)`;
let answer = [];

let fileToProcess;
let uploadedFile;
let vectorStore;
let vsAttachResponse;
let thread;
let stream;
let errorCount;
let expectedAnswersLocal;
let receivedInquiry;

async function processUploadedFile(inputFile, results, inquiry) {
  expectedAnswersLocal = results;
  await uploadFile(inputFile, results, inquiry);
  await createVectorStore();
  await attachVectorStore();
  await createThread();
  await runThread();

  // Ensure the file deletion happens after the assistant's response is processed
  await new Promise((resolve) => {
    stream.on("messageDone", async (event) => {
      if (event.content[0].type === "text") {
        const { text } = await event.content[0];
        openaiResponse = await event.content[0].text.value;
        resolve();
      }
    });
  });

  deleteFile(uploadedFile.id);
  openaiResponse = openaiResponse.replace(/'/g, '"');

  return { openaiResponse };
}

async function uploadFile(inputFile, results, inquiry) {
  console.log("uploadfile");
  fileToProcess = inputFile;
  receivedInquiry = inquiry;

  console.log(fileToProcess);
  uploadedFile = await openai.files.create({
    file: fs.createReadStream(fileToProcess),
    purpose: "assistants",
  });
}
let prompt = `${question0}${receivedInquiry}.${question} ${tableHeaders.join(
  ", "
)} ${question2}. If vectorstore has a table, forget the empty rows. Example of expected response: [{PROVIDER:"CARLOS", "PRODUCT DESCRIPTION":"number 5 ball"....}, {PROVIDER:"CARLOS", "PRODUCT DESCRIPTION":"number 4 ball"....}, ...]`;

async function createVectorStore() {
  var d = new Date();
  d = d.getTime().toString();
  vectorStore = await openai.beta.vectorStores.create({
    name: `vs${d}`,
    file_ids: [uploadedFile.id],
  });
}

async function attachVectorStore() {
  vsAttachResponse = await openai.beta.assistants.update(assistantId, {
    tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
  });
  console.log("vsattach", vsAttachResponse);
}

async function createThread() {
  thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
}

async function runThread() {
  console.log("en run thread");
  try {
    stream = await openai.beta.threads.runs
      .stream(thread.id, {
        assistant_id: assistantId,
      })
      .on("textCreated", () => console.log("assistant >"))
      .on("toolCallCreated", (event) => console.log("assistant " + event.type))
      .on("messageDone", async (event) => {
        if (event.content[0].type === "text") {
          const { text } = await event.content[0];
          openaiResponse = await event.content[0].text.value;
          console.log("resp", event.content[0].text.value);
        }
      });
    await console.log(stream);
  } catch (error) {
    console.log(error);
  }
}

//delete uploaded file
async function deleteFile(fileId) {
  try {
    const response = await openai.files.del(fileId);
    console.log(`File with ID ${fileId} has been deleted.`);
    console.log(response);
  } catch (error) {
    console.error(`Error deleting file with ID ${fileId}:`, error);
  }
}
processUploadedFile;
module.exports = {
  processUploadedFile,
};
