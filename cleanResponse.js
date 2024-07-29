function cleanOpenAIResponse(openaiResponse) {
  // Use a regular expression to match the JSON part
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = openaiResponse.match(jsonRegex);

  if (match && match[1]) {
    return match[1].trim();
  } else {
    throw new Error("Invalid OpenAI response format");
  }
}
module.exports = {
  cleanOpenAIResponse,
};
