const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'ucu_innovators',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false,
    }
);

const User = require('./User')(sequelize);
const Project = require('./Project')(sequelize);
const Faculty = require('./Faculty')(sequelize);
const Department = require('./Department')(sequelize);
const Comment = require('./Comment')(sequelize);
const ProjectView = require('./ProjectView')(sequelize);

// Associations

// Faculty <-> Department
Faculty.hasMany(Department, { foreignKey: 'faculty_id' });
Department.belongsTo(Faculty, { foreignKey: 'faculty_id' });

// Faculty/Department <-> User
Faculty.hasMany(User, { foreignKey: 'faculty_id' });
User.belongsTo(Faculty, { foreignKey: 'faculty_id' });

Department.hasMany(User, { foreignKey: 'department_id' });
User.belongsTo(Department, { foreignKey: 'department_id' });

// User <-> Project
User.hasMany(Project, { as: 'Projects', foreignKey: 'student_id' });
Project.belongsTo(User, { as: 'Student', foreignKey: 'student_id' });

User.hasMany(Project, { as: 'SupervisedProjects', foreignKey: 'supervisor_id' });
Project.belongsTo(User, { as: 'Supervisor', foreignKey: 'supervisor_id' });

// Project <-> Comment
Project.hasMany(Comment, { foreignKey: 'project_id' });
Comment.belongsTo(Project, { foreignKey: 'project_id' });

// User <-> Comment
User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

// Project <-> ProjectView
Project.hasMany(ProjectView, { foreignKey: 'project_id' });
ProjectView.belongsTo(Project, { foreignKey: 'project_id' });

const db = {
    sequelize,
    Sequelize,
    User,
    Project,
    Faculty,
    Department,
    Comment,
    ProjectView
};

module.exports = db;
