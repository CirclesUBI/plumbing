const { Op } = require("sequelize");

const { Edge } = require('./models/edges');

async function upsertEdge(edge) {
    if (edge.capacity.toString() === '0') {
        return destroyEdge(edge);
    } else {
        return Edge.upsert(edge, {
            where: {
            token: edge.token,
            from: edge.from,
            to: edge.to,
            },
        });
    }
}

async function destroyEdge(edge) {
    return Edge.destroy({
        where: {
        token: edge.token,
        from: edge.from,
        to: edge.to,
        },
    });
}

async function getOldestEdges(limit) {
    return await Edge.findAll({
        order: [['updatedAt', 'ASC']],
        limit: limit,
        raw: true,
    });
}

async function getUserEdges(limit, address) {
    return await Edge.findAll({
        order: [['updatedAt', 'ASC']],
        limit: limit,
        raw: true,
        where: {
            [Op.or]: [
              { from: address },
              { to: address }
            ]
        }
    });
}

module.exports = {
    upsertEdge,
    destroyEdge,
    getOldestEdges,
    getUserEdges,
}