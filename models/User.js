const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('student', 'supervisor', 'admin', 'faculty_admin'),
            defaultValue: 'student'
        },
        accessNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        profilePhotoUrl: {
            type: DataTypes.STRING,
            allowNull: true
        },
        registrationNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        yearOfEntry: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        gender: {
            type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
            allowNull: true
        },
        nationality: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: 'Ugandan'
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        otherNames: {
            type: DataTypes.STRING,
            allowNull: true
        },
        department: {
            type: DataTypes.STRING,
            allowNull: true
        },
        hobbies: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        resetPasswordToken: {
            type: DataTypes.STRING,
            allowNull: true
        },
        resetPasswordExpires: {
            type: DataTypes.DATE,
            allowNull: true
        }
    });

    return User;
};






