const Sequelize = require('sequelize');

const { db } = require('../database.js');

const Edge = db.define(
  'edges',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    from: {
      type: Sequelize.STRING(42),
      allowNull: false,
      unique: 'edges_unique',
    },
    to: {
      type: Sequelize.STRING(42),
      allowNull: false,
      unique: 'edges_unique',
    },
    token: {
      type: Sequelize.STRING(42),
      allowNull: false,
      unique: 'edges_unique',
    },
    capacity: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        name: 'edges_unique',
        unique: true,
        fields: ['from', 'to', 'token'],
      },
    ],
  },
);

module.exports = {
    Edge,
}
