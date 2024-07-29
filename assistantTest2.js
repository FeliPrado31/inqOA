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
  "# ITEM",
  "PM",
  "COMPANY NAME",
  "SALES CONTACT",
  "WECHAT",
  "EMAIL",
  "PRODUCT DESCRIPTION",
  "REFERENCE PICTURE",
  "PRODUCT REAL DESCRIPTION",
  "PRODUCT REAL PICTURES",
  "MATERIAL",
  "SIZES OR CAPACITY",
  "CERTIFICATE. ",
  "OTHER CERTIFICATE",
  "LOGO DETAILS ",
  "OTHER LOGO",
  "SET UP CHARGE",
  "SAMPLE TIME",
  "PRODUCTION TIME",
  "INCOTERM",
  "QUANTITY",
  "PRICE",
  "PCS PER BOX",
  "L",
  "H",
  "W",
  "GW KG",
  "EMPTY",
  "PRODUCTO",
  "ORIGEN",
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
I need you to find the relevant information and give it back to me as an array of JSON objects, with one json object(without extra formatting) per size-quantity-incoterm combination present (this means that the amount of jsons you will give me is equal to: [number of sizes offered] x [number of quantities offered] x [incoterm options], if one of them is not informed take its value as 1) with the following attributes:  `;
const question2 = ` Leave empty this attributes, their information is not anything on the vectorstore: "# ITEM","PM", "REFERENCE PICTURE", "PRODUCT DESCRIPTION", "EMPTY", "PRODUCTO", "ORIGEN" and "CODE NUMBER". If you can't find an attribute's value, define it as NF. The following attributes' values should be only numbers, without currency or units, as they will be used for calculations:"SET UP CHARGE USD", "SAMPLE TIME","PRODUCTION TIME", "QUANTITY", "PRICE USD", "PCS PER BOX", "L", "H", "W", "GW KG". The value for INCOTERM should be one of the following:"EXW", "FOB Shanghai", "FOB Shenzhen", "FOB Ningbo", "FOB Ningbo-Zhoushan", "FOB Hong Kong", "FOB Guangzhou", "FOB Qingdao", "FOB Tianjin", "FOB Dalian", "FOB Xiamen", "FOB Yingkou", "FOB Taizhou", "FOB Yantian", "NF" according to the price cited in the column PRICE USD.The following attributes values should refer to the manufacturer, not to the person asking for the information, the manufacturers are usually Chinese:  "COMPANY NAME", "SALES CONTACT", "WECHAT",  "EMAIL".  Dont wrap this array in a json object. Sample cost is not equal to setup cost, dont write sample cost in setup cost column. For attribute "PRODUCT REAL DESCRIPTION" copy all information describing the product, dont summarize. Setup cost might be sometimes found in the additional notes. All atributes should be enclosed in single quotation marks. Don't add any other text besides the array of json objects.`;
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

async function processUploadedFile(inputFile, results, inquiry, res) {
  //console.log("RES en assistant", res);
  expectedAnswersLocal = results;
  await uploadFile(inputFile, results, inquiry, res);
  await createVectorStore(res);
  await attachVectorStore(res);
  await createThread(res);
  await runThread(res);

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

async function uploadFile(inputFile, results, inquiry, res) {
  //console.log("res en upload:", res);
  console.log("uploadfile");
  fileToProcess = inputFile;
  receivedInquiry = inquiry;

  console.log(fileToProcess);
  try {
    uploadedFile = await openai.files.create({
      file: fs.createReadStream(fileToProcess),
      purpose: "assistants",
    });
    //res.render("download.ejs");
  } catch (error) {
    console.log(error);
  }
}
let prompt = `${question0}${receivedInquiry}.${question} ${tableHeaders.join(
  ", "
)} ${question2}. If vectorstore has a table, forget the empty rows. Example of expected response: [{"# ITEM":"", "PM":"", "COMPANY NAME":"Big Company", "SALES CONTACT":"Laura","WECHAT":"+54-11-4567-890"....}, {"# ITEM":"", "PM":"", "COMPANY NAME":"Small company", "SALES CONTACT":"Robert","WECHAT":"+54-11-9876-543"....}, ...]`;

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
          console.log(
            "assistant resp",
            event.content[0].text.value.slice(0, 20)
          );
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
