const { Attendance } = require('../model/attendModel')
const moment = require('moment');


async function scheduleReset(uuid) {
  const now = moment().toDate('YY-MM-DD');
  
  const existingAttendance = await Attendance.findOne({
    where: {
      uuid: uuid,
      date: now,

    },
  });

  if (!existingAttendance) {
    await Attendance.create({
        uuid: uuid,
        date: now,
        clockin_time: null,
        clockout_time: null,
        status: null
      }); 
  }
}




  module.exports = scheduleReset