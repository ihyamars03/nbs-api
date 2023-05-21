const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
    projectId: 'nbs-company-386604',
    keyFilename: '../credentials/key.json',
  });
  
  const bucketName = 'nbs-bucket';
  

  const uploadImage = (file) => {
    if (!file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }
  
      const bucket = storage.bucket(bucketName);
  
      const fileName = `${Math.floor(Math.random() * 100000000)}.jpg`;
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
        res.status(200).json({ message: 'File uploaded successfully', url: publicUrl });
      });
  
      blobStream.end(file.buffer);
  }

  module.exports = {uploadImage}