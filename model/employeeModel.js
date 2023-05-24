const {sequelize, DataTypes} = require('../database/dbConfig')

const employees = sequelize.define('employees', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      position: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      divisi: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      wa: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      photo: {
        type: DataTypes.STRING,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_email: {
        type: DataTypes.STRING(200),
      },

  });

  module.exports = employees
