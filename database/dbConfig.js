require('dotenv').config();
const { Sequelize, DataTypes} = require('sequelize');
const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool = new Pool({
    connectionString: connectionString
});

module.exports = { pool, sequelize, DataTypes}