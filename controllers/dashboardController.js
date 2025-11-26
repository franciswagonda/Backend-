const db = require('../models');
const Project = db.Project;
const User = db.User;
const Faculty = db.Faculty;
const sequelize = db.sequelize;

exports.getDashboardStats = async (req, res) => {
    try {
        // Total Projects
        const totalProjects = await Project.count();

        // Projects by Status
        const projectsByStatus = await Project.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
            group: ['status']
        });

        // Projects by Faculty (requires join through User)
        // This is a bit complex with Sequelize, let's try a raw query or simplified approach
        // For MVP, let's just count users per faculty as a proxy or do a raw query

        const [projectsByFaculty] = await sequelize.query(`
            SELECT f.name as faculty, COUNT(p.id) as count
            FROM Projects p
            JOIN Users u ON p.student_id = u.id
            JOIN Faculties f ON u.faculty_id = f.id
            GROUP BY f.name
        `);

        // Recent Projects
        const recentProjects = await Project.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'Student', attributes: ['name'] }]
        });

        // Total Public Views
        const totalViews = await db.ProjectView.count();

        // Advanced Analytics

        // 1. Approval Rate
        const approvedCount = await Project.count({ where: { status: 'approved' } });
        const approvalRate = totalProjects > 0 ? ((approvedCount / totalProjects) * 100).toFixed(1) : 0;

        // 2. Trending Technologies (Simple frequency count)
        const allProjects = await Project.findAll({ attributes: ['technologies'] });
        const techMap = {};
        allProjects.forEach(p => {
            if (p.technologies) {
                // Split by comma, trim whitespace
                const techs = p.technologies.split(',').map(t => t.trim());
                techs.forEach(t => {
                    techMap[t] = (techMap[t] || 0) + 1;
                });
            }
        });
        // Sort by count desc and take top 5
        const trendingTech = Object.entries(techMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // 3. Most Active Innovators
        const activeInnovators = await Project.findAll({
            attributes: [
                [sequelize.col('Student.name'), 'studentName'],
                [sequelize.fn('COUNT', sequelize.col('Project.id')), 'projectCount']
            ],
            include: [{ model: User, as: 'Student', attributes: [] }],
            group: ['Student.id', 'Student.name'],
            order: [[sequelize.literal('projectCount'), 'DESC']],
            limit: 5
        });

        res.json({
            totalProjects,
            projectsByStatus,
            projectsByFaculty,
            recentProjects,
            totalViews,
            approvalRate,
            trendingTech,
            activeInnovators
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
