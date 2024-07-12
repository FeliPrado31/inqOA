async function sendFileToOpenAI(item, resultsPerDoc) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiEndpoint = "https://api.openai.com/v1/chat/completions";

  let prompt;
  //console.log("item en sendfile:", item);
  if (item.type === "file") {
    // Convert file buffer to a string or extract text if possible
    // For simplicity, let's assume we can convert the file buffer to a string
    prompt = item.data.buffer.toString("utf-8");
    console.log(prompt);
  } else if (item.type === "content") {
    prompt = `JSON.stringify(item.data)`;
    console.log("prompt", prompt);
  }

  /*   const response = await axios.post(
    openaiEndpoint,
    {
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
    },
    {
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response; */
}

exports.sendFileToOpenAI = sendFileToOpenAI;
