const db = require('../models');
const Project = db.Project;
const User = db.User;

// Create Project
exports.createProject = async (req, res) => {
    try {
        const { title, description, category, technologies, github_link, supervisor_id } = req.body;

        console.log('Creating project for student:', req.user.id);
        console.log('Project data:', { title, category, student_id: req.user.id });

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

        console.log('Project created:', { id: project.id, title: project.title, student_id: project.student_id });

        res.status(201).json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get My Faculty Projects (for supervisors and faculty admins)
exports.getMyFacultyProjects = async (req, res) => {
    try {
        // Fetch current user from DB to get faculty_id and department_id
        const currentUser = await User.findByPk(req.user.id, {
            attributes: ['faculty_id', 'department_id', 'role']
        });

        if (!currentUser || !currentUser.faculty_id) {
            return res.status(400).json({ message: 'User faculty not found' });
        }

        // Build the where clause for student filtering
        let studentWhere = { faculty_id: currentUser.faculty_id };
        
        // Supervisors see only projects from their department
        if (currentUser.role === 'supervisor' && currentUser.department_id) {
            studentWhere.department_id = currentUser.department_id;
        }

        // Get all projects where student matches the criteria
        const projects = await Project.findAll({
            include: [
                {
                    model: User,
                    as: 'Student',
                    attributes: ['name', 'email', 'faculty_id', 'department_id'],
                    where: studentWhere,
                    include: [
                        { model: db.Faculty, attributes: ['name'] },
                        { model: db.Department, attributes: ['name'] }
                    ]
                },
                { model: User, as: 'Supervisor', attributes: ['name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(projects);
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
        const project = await Project.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'Student',
                    attributes: ['department_id', 'faculty_id']
                }
            ]
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (req.user.role !== 'supervisor' && req.user.role !== 'admin' && req.user.role !== 'faculty_admin') {
            return res.status(403).json({ message: 'Not authorized to review' });
        }

        // Supervisors can only review projects from their department
        if (req.user.role === 'supervisor') {
            const currentUser = await User.findByPk(req.user.id);
            if (project.Student.department_id !== currentUser.department_id) {
                return res.status(403).json({ message: 'You can only review projects from your department' });
            }
        }

        // Faculty admins can only review projects from their faculty
        if (req.user.role === 'faculty_admin') {
            const currentUser = await User.findByPk(req.user.id);
            if (project.Student.faculty_id !== currentUser.faculty_id) {
                return res.status(403).json({ message: 'You can only review projects from your faculty' });
            }
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

// Get projects for the authenticated student
exports.getMyProjects = async (req, res) => {
    try {
        console.log('getMyProjects called by user:', req.user.id, 'role:', req.user.role);
        
        // Ensure only the owner (student) or admin can access
        const currentUser = await User.findByPk(req.user.id);
        if (!currentUser) return res.status(404).json({ message: 'User not found' });
        
        console.log('Current user:', currentUser.id, currentUser.email, currentUser.role);
        
        if (currentUser.role !== 'student' && currentUser.role !== 'admin') {
            return res.status(403).json({ message: 'Only students can view their submissions' });
        }

        const projects = await Project.findAll({
            where: { student_id: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        
        console.log('Found projects for student', req.user.id, ':', projects.length);
        console.log('Projects:', projects.map(p => ({ id: p.id, title: p.title, student_id: p.student_id })));
        
        res.json(projects);
    } catch (error) {
        console.error('Error in getMyProjects:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
