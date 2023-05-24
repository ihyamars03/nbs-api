const {sequelize, DataTypes} = require('../database/dbConfig')

const users = sequelize.define('users', {
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(200),
    allowNull: false,
    primaryKey: true,
  },
  password: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: sequelize.UUIDV4,
    allowNull: false,
  }
  });

  module.exports = users
