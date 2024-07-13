//https://platform.openai.com/docs/assistants/tools/file-search/quickstart?lang=node.js&context=without-streaming

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import "dotenv/config"; // Import dotenv configuration
import FormData from "form-data";

import OpenAI from "openai";
const openai = new OpenAI();

const apiKey = process.env.OPENAI_API_KEY;

const vectorStoreId = process.env.VSID;
const assistantId = process.env.ASSID;
let assistant = null;

async function main() {
  const createAssistant = await openai.beta.assistants.create({
    name: "Financial Analyst Assistant",
    instructions:
      "You are an expert financial analyst. Use you knowledge base to answer questions about audited financial statements.",
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });
  assistant = createAssistant;
}

main();

//Upload files
const fileStreams = ["Jinxian.pdf", "Dawnstar.pdf"].map((path) =>
  fs.createReadStream(path)
);

fileStreams.forEach((stream) => {
  stream.on("open", () => {
    console.log(`File ${stream.path} is open`);
  });
  console.log("File Streams:", fileStreams);
  stream.on("error", (err) => {
    console.error(`Error reading file ${stream.path}:`, err);
  });
});

// Create a vector store including our two files.
let vectorStore = await openai.beta.vectorStores.create({
  name: "Financial Statement",
});

await openai.beta.vectorStores.fileBatches.uploadAndPoll(
  vectorStore.id,
  fileStreams
);

/* await openai.beta.assistants.update(assistantId, {
  tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
}); */
/* 
//create thread
const thread = await openai.beta.threads.create({
  messages: [
    {
      role: "user",
      content:
        "Give me every price/quantity in each document in the vector store, specifying the provider",
    },
  ],
});

//run the thread
const run = await openai.beta.threads.runs.create(thread.id, {
  assistant_id: assistantId,
});

const messages = await openai.beta.threads.messages.list(thread.id, {
  run_id: run.id,
});

console.log(messages.data);
 */
