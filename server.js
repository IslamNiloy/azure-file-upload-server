const express = require("express");
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, "public")));

// Multer setup to handle file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 10MB
});

// Azure Blob Storage setup
const blobServiceClient = BlobServiceClient.fromConnectionString(
  `DefaultEndpointsProtocol=https;AccountName=${process.env.AZURE_STORAGE_ACCOUNT_NAME};AccountKey=${process.env.AZURE_STORAGE_ACCOUNT_KEY};EndpointSuffix=core.windows.net`
);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

// Health Check
app.get("/", (req, res) => {
  res.send("Azure File Upload Server is running!");
});

// Render the upload page with the selected folder pre-selected
app.get("/upload-page", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API to upload files
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }
  
      const { folder, dealName } = req.body;
      if (!folder || !dealName) {
        return res.status(400).send({
          success: false,
          message: "Folder and deal name are required.",
        });
      }
  
      const blobName = `${dealName}/${folder}/${path.basename(req.file.originalname)}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
      // Upload the file
      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });
  
      res.status(200).send({
        success: true,
        message: "File uploaded successfully.",
        fileUrl: blockBlobClient.url,
      });
    } catch (err) {
      console.error("Error uploading file:", err.message);
      res.status(500).send({
        success: false,
        message: "Failed to upload file.",
        error: err.message,
      });
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
