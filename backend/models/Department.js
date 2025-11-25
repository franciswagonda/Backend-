const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Department = sequelize.define('Department', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });

    return Department;
};
