const Sequelize = require('sequelize');
const config = require('./config.json');

const url = config.DB_CONNECTION;
const dialect = 'postgres';
const dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
const ssl = true;

const db = new Sequelize(url, {
  dialect,
  dialectOptions,
  ssl,
  logging: (msg) => {
    console.log(msg);
  },
});

module.exports = {
    db,
}
