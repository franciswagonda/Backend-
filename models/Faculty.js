const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Faculty = sequelize.define('Faculty', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    });

    return Faculty;
};
