const express = require('express')
const router = express.Router()
const Multer = require('multer');
const { Storage } = require('@google-cloud/storage');

const app = express();

// Konfigurasi Google Cloud Storage
const storage = new Storage({
  projectId: 'nbs-company-386604',
  keyFilename: '../credentials/key.json',
});

const bucketName = 'nbs-bucket';

// Konfigurasi Multer untuk mengunggah file
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Batasan ukuran file (5MB)
  },
});

// Endpoint untuk mengunggah file
router.post('/attend', multer.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const bucket = storage.bucket(bucketName);

    const fileName = `${Date.now()}_${file.originalname}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      gzip: true,
    });

    blobStream.on('error', (error) => {
      console.error(error);
      res.status(500).json({ message: 'Failed to upload file' });
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
      res.json({ message: 'File uploaded successfully', url: publicUrl });
    });

    blobStream.end(file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  
});


module.exports = router