const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
require("dotenv").config();

const app = express();
const upload = multer({ dest: "uploads/" });

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Generate a URL for the user to authorize
app.get("/auth/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive"],
  });
  res.redirect(authUrl);
});

// Handle the callback from Google
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.send("Authentication successful! You can now close this window.");
  } catch (error) {
    console.error("Error authenticating:", error);
    res.status(500).send("Authentication failed");
  }
});

// Endpoint to fetch user's folders from Google Drive
app.get("/folders", async (req, res) => {
  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      fields: "files(id, name, parents)",
    });

    const folders = response.data.files;
    res.status(200).json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint to upload a file to Google Drive
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const folderId = req.body.folderId;

    if (!file) {
      return res.status(400).send("No file uploaded.");
    }

    if (!folderId) {
      return res.status(400).send("No folder ID provided.");
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const fileMetadata = {
      name: file.originalname,
      parents: [folderId],
    };

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    fs.unlinkSync(file.path); // Remove the file from the server after upload

    res.status(200).send(`File uploaded with ID: ${response.data.id}`);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
