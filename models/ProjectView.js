const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProjectView = sequelize.define('ProjectView', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        ip_address: {
            type: DataTypes.STRING,
            allowNull: true // Optional, for anonymous tracking
        },
        viewed_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    });

    return ProjectView;
};
