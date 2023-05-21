const express = require('express')
const router = express.Router()
const {Attendance} = require('../model/attendModel')


// Endpoint untuk mengunggah file
router.post('/clockin:employeeId', async (req, res) => {
 try {
  const dateObject = new Date();
  const {employeeId} = req.body

  let date = ("0" + dateObject.getDate()).slice(-2);
  let month = ("0" + (dateObject.getMonth() + 1)).slice(-2);
  let year = dateObject.getFullYear();

  let hours = dateObject.getHours(); 
  let minutes = dateObject.getMinutes() > 9 ? dateObject.getMinutes() : '0'+dateObject.getMinutes();

  
  let fraud = true
  
  if (!fraud) { res.status(400).json({message: 'Gambar bukan berupa wajah'})}

  
  const attendance = await Attendance.create({
    employee_id: employeeId,
    attendance_date: `${date}/${month}/${year}`,
    clockin_time: `${hours}:${minutes}`,
    clockout_time: "00:00",
    status: parseInt(clockin_time.split(':')[0]) <= 8 ? 'ontime' : 'late'
  });

  res.status(200).json(attendance)

 } catch (error) {
  res.status(500).json({ message: 'Internal server error', error: error });
 }
  
});

router.put('/clockout:employeeId', async (req, res) => {
  try {
    const dateObject = new Date();
    let hours = dateObject.getHours(); 
    let minutes = dateObject.getMinutes() > 9 ? dateObject.getMinutes() : '0'+dateObject.getMinutes();

    const {employeeId} = req.body;
    const attendance = await Attendance.findAll(
      {
        where: {
          employeeId: employeeId
        }
      }
    );

    if (!attendance) {
      return res.status(404).json({ message: 'User not found' });
    }
    attendance.clockout_time = `${hours}:${minutes}`;
    await attendance.save();

    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history:employeeId', async (res,req) => {
  try {
    const {employeeId} = req.body;
    const attendance = await Attendance.findAll(
      {
        where: {
          employeeId: employeeId
        }
      }
    );
    res.status(200).json(attendance)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
})


module.exports = router