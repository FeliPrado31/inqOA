//https://platform.openai.com/docs/assistants/tools/file-search/quickstart?lang=node.js&context=without-streaming

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import "dotenv/config"; // Import dotenv configuration
import FormData from "form-data";
import XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname } from "path";

import OpenAI from "openai";
import { excelToHTML } from "./excelToHTML.js";
const openai = new OpenAI();

const apiKey = process.env.OPENAI_API_KEY;

const vectorStoreId = process.env.VSID;
const assistantId = process.env.ASSID;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let fileToProcess;
let uploadedFile;
let vectorStore;
let vsAttachResponse;
let thread;
let stream;
let errorCount;
let expectedAnswersLocal;

export async function processUploadedFile(file, expectedAnswers) {
  expectedAnswersLocal = expectedAnswers;
  await uploadFile(file);
  await createVectorStore();
  await attachVectorStore();
  await createThread();
  await runThread();

  deleteFile(uploadedFile.id);
}

async function uploadFile(inputFile) {
  if (path.extname(inputFile) === ".xlsx") {
    fileToProcess = await excelToHTML(inputFile);
  } else {
    fileToProcess = inputFile;
  }
  console.log(fileToProcess);
  uploadedFile = await openai.files.create({
    file: fs.createReadStream(fileToProcess),
    purpose: "assistants",
  });
}

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
  console.log(vsAttachResponse);
}

async function createThread() {
  thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content:
          "from the doc in vector store, tell me the product descriptions",
      },
    ],
  });
}

async function runThread() {
  stream = openai.beta.threads.runs
    .stream(thread.id, {
      assistant_id: assistantId,
    })
    .on("textCreated", () => console.log("assistant >"))
    .on("toolCallCreated", (event) => console.log("assistant " + event.type))
    .on("messageDone", async (event) => {
      if (event.content[0].type === "text") {
        const { text } = event.content[0];

        let index = 0;

        console.log("resp", event.content[0].text.value);
      }
    });
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
