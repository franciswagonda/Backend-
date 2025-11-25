const db = require('../models');
const Faculty = db.Faculty;
const Department = db.Department;

// Get all faculties
exports.getAllFaculties = async (req, res) => {
    try {
        const faculties = await Faculty.findAll({
            include: [{
                model: Department,
                attributes: ['id', 'name']
            }],
            order: [['name', 'ASC']]
        });
        res.json(faculties);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single faculty with departments
exports.getFacultyById = async (req, res) => {
    try {
        const faculty = await Faculty.findByPk(req.params.id, {
            include: [{
                model: Department,
                attributes: ['id', 'name']
            }]
        });
        
        if (!faculty) {
            return res.status(404).json({ message: 'Faculty not found' });
        }
        
        res.json(faculty);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all departments (optionally filtered by faculty)
exports.getAllDepartments = async (req, res) => {
    try {
        const { faculty_id } = req.query;
        const where = {};
        
        if (faculty_id) {
            where.faculty_id = faculty_id;
        }
        
        const departments = await Department.findAll({
            where,
            include: [{
                model: Faculty,
                attributes: ['id', 'name']
            }],
            order: [['name', 'ASC']]
        });
        
        res.json(departments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
