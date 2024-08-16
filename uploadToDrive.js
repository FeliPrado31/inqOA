const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const inquirer = require("inquirer");
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "http://localhost"
);

function authorize(callback) {
  fs.readFile("token.json", (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      fs.writeFile("token.json", JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to token.json");
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 */
async function uploadFile(auth) {
  const drive = google.drive({ version: "v3", auth });

  const {
    data: { files },
  } = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder'",
    fields: "files(id, name)",
  });

  if (!files.length) {
    console.log("No folders found.");
    return;
  }

  const folders = files.map((file) => ({ name: file.name, value: file.id }));

  const { selectedFolder } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedFolder",
      message: "Select a folder to upload the file to:",
      choices: folders,
    },
  ]);

  const { filePath } = await inquirer.prompt([
    {
      type: "input",
      name: "filePath",
      message: "Enter the path of the file to upload:",
      validate: (input) =>
        fs.existsSync(input) ? true : "File does not exist",
    },
  ]);

  const fileMetadata = {
    name: filePath.split("/").pop(),
    parents: [selectedFolder],
  };
  const media = {
    body: fs.createReadStream(filePath),
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });

  console.log("File uploaded successfully, File ID:", file.data.id);
}

authorize(uploadFile);
