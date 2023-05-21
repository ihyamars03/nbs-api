const {sequelize, DataTypes} = require('../database/dbConfig')

const Attendance = sequelize.define('attendance', {
    attend_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.UUID,
      allowNull: false
    },
    attendance_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    clockin_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    clockout_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['late', 'ontime']]
      }
    }

  });

  module.exports = {Attendance}