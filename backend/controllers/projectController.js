const db = require('../models');
const Project = db.Project;
const User = db.User;

// Create Project
exports.createProject = async (req, res) => {
    try {
        const { title, description, category, technologies, github_link, supervisor_id } = req.body;

        // Handle file upload
        let document_url = '';
        if (req.file) {
            document_url = req.file.path;
        }

        const project = await Project.create({
            title,
            description,
            category,
            technologies,
            github_link,
            document_url,
            student_id: req.user.id,
            supervisor_id
        });

        res.status(201).json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get All Projects (Public Gallery)
exports.getAllProjects = async (req, res) => {
    try {
        const { category, technology, faculty, department, year } = req.query;
        const { Op } = require('sequelize');

        // Build Filter Object
        let whereClause = { status: 'approved' };

        if (category) {
            whereClause.category = category;
        }

        if (technology) {
            whereClause.technologies = { [Op.like]: `%${technology}%` };
        }

        if (year) {
            const startDate = new Date(`${year}-01-01`);
            const endDate = new Date(`${year}-12-31`);
            whereClause.createdAt = {
                [Op.between]: [startDate, endDate]
            };
        }

        // Build Include Object
        let includeOptions = [
            {
                model: User,
                as: 'Student',
                attributes: ['name', 'email'],
                include: [
                    faculty ? { model: db.Faculty, where: { name: faculty } } : { model: db.Faculty },
                    department ? { model: db.Department, where: { name: department } } : { model: db.Department }
                ]
            },
            { model: User, as: 'Supervisor', attributes: ['name'] }
        ];

        const projects = await Project.findAll({
            where: whereClause,
            include: includeOptions
        });
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Project by ID
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id, {
            include: [
                { model: User, as: 'Student', attributes: ['name', 'email'] },
                { model: User, as: 'Supervisor', attributes: ['name'] }
            ]
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Record View
        await db.ProjectView.create({
            project_id: project.id,
            ip_address: req.ip
        });

        // Get View Count
        const viewCount = await db.ProjectView.count({ where: { project_id: project.id } });

        const projectData = project.toJSON();
        projectData.viewCount = viewCount;

        res.json(projectData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update Project (Student)
exports.updateProject = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.student_id !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { title, description, category, technologies, github_link } = req.body;

        project.title = title || project.title;
        project.description = description || project.description;
        project.category = category || project.category;
        project.technologies = technologies || project.technologies;
        project.github_link = github_link || project.github_link;

        if (req.file) {
            project.document_url = req.file.path;
        }

        // Moderation: Revert to pending if updated by student
        if (req.user.role === 'student') {
            project.status = 'pending';
        }

        await project.save();
        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Review Project (Supervisor/Admin)
exports.reviewProject = async (req, res) => {
    try {
        const { status } = req.body;
        const project = await Project.findByPk(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to review' });
        }

        project.status = status;
        await project.save();

        res.json({ message: `Project ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete Project
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.student_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await project.destroy();
        res.json({ message: 'Project removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add Comment
exports.addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const project = await Project.findByPk(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const comment = await db.Comment.create({
            content,
            project_id: project.id,
            user_id: req.user.id
        });

        const fullComment = await db.Comment.findByPk(comment.id, {
            include: [{ model: User, attributes: ['name', 'role'] }]
        });

        res.status(201).json(fullComment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Project Comments
exports.getProjectComments = async (req, res) => {
    try {
        const comments = await db.Comment.findAll({
            where: { project_id: req.params.id },
            include: [{ model: User, attributes: ['name', 'role'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
