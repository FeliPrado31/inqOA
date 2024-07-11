async function sendFileToOpenAI(item, resultsPerDoc) {
  const openaiApiKey = "YOUR_OPENAI_API_KEY";
  const openaiEndpoint =
    "https://api.openai.com/v1/engines/davinci/completions";

  const formData = new FormData();

  if (item.type === "file") {
    formData.append("file", item.data.buffer, {
      filename: item.data.originalname,
    });
  } else if (item.type === "content") {
    formData.append("content", JSON.stringify(item.data));
  }

  formData.append("resultsPerDoc", resultsPerDoc);

  const response = await axios.post(openaiEndpoint, formData, {
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      ...formData.getHeaders(),
    },
  });

  return response;
}
