const express = require('express')
const router = express.Router()
const moment = require('moment');
const Multer = require('multer');
const { Attendance } = require('../model/attendModel')
const { Storage } = require('@google-cloud/storage');


const storage = new Storage({
  projectId: 'nbs-company-386604',
  keyFilename: './credentials/key.json',
});

const bucketName = 'nbs-bucket';
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Batasan ukuran file (5MB)
  },
});

router.post('/clockin/:uuid', multer.single('file'), async (req, res) => {
  
  try {
    const {uuid} = req.params
    const file = req.file;

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
      res.status(500).json({ message: 'Failed to upload photo' });
    });

    // blobStream.on('finish', () => {
    //   const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
    //   res.json({ message: 'File uploaded successfully', url: publicUrl });
    // });

    blobStream.end(file.buffer);

    const currentTime = moment().format('HH:mm');
    
    const fraud = true
    
    if (!fraud) { res.status(400).json({message: 'Gambar bukan berupa wajah'})}
    
    const existingAttendance = await Attendance.findOne({
      where: {
        uuid,
        clockout_time: '00:00',
      },
    });

    if (existingAttendance) {
      return res.status(400).json({ error: 'Already clocked in' });
    }

    let status = parseInt(currentTime.split(':')[0]) <= 8 ? 'ontime' : 'late'
  
    const newAttendance = await Attendance.create({
      uuid: uuid,
      attendance_date: Date.now(),
      clockin_time: currentTime,
      clockout_time: '00:00',
      status: status
    });
   
    res.status(200).json({message:'Berhasil Presensi', data: newAttendance})

 } catch (err) {
  console.log(err);
  res.status(500).json({message: 'Internal Server Error'})
 }
  
});

router.put('/clockout/:uuid', async (req, res) => {
  try {
    const currentTime = moment().format('HH:mm');
    const {uuid} = req.params;

    const attendance = await Attendance.findOne({
      where: {
        uuid,
        clockout_time: '00:00',
      },
    });
    if (!attendance) {
      return res.status(400).json({ error: 'No active clock-in found' });
    }


    attendance.clockout_time = currentTime;
    await attendance.save();

    res.status(200).json(attendance);
  } catch (err) {
    console.log(err);
    res.status(500).json({message: 'Internal Server Error'})
  }
});

router.get('/history/:uuid', async (req, res) => {
  try {
    const {uuid} = req.params;
    const attendance = await Attendance.findAll(
      {
        where: {
          uuid: uuid
        }
      }
    );
    res.status(200).json(attendance)
  } catch (error) {
    console.log(err);
    res.status(500).json({message: 'Internal Server Error'})
  }
})


module.exports = router