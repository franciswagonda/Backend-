require('dotenv').config();
const db = require('./models');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        await db.sequelize.sync();

        const faculties = [
            {
                name: 'Faculty of Agricultural Sciences',
                departments: [
                    'Department of Agronomy',
                    'Department of Horticulture',
                    'Department of Soil Science',
                    'Department of Food Technology',
                    'Department of Environmental Science'
                ]
            },
            {
                name: 'Faculty of Engineering, Design & Technology',
                departments: [
                    'Department of Mechanical Engineering',
                    'Department of Electrical Engineering',
                    'Department of Civil Engineering',
                    'Department of Computer Engineering',
                    'Department of Industrial Design'
                ]
            },
            {
                name: 'Faculty of Public Health, Nursing & Midwifery',
                departments: [
                    'Department of Nursing',
                    'Department of Midwifery',
                    'Department of Public Health',
                    'Department of Medical Laboratory Science',
                    'Department of Biomedical Engineering'
                ]
            },
            {
                name: 'Faculty of Information Technology',
                departments: [
                    'Department of Computer Science',
                    'Department of Software Engineering',
                    'Department of Cybersecurity',
                    'Department of Data Science'
                ]
            },
            {
                name: 'Faculty of Business & Management',
                departments: [
                    'Department of Business Administration',
                    'Department of Management',
                    'Department of Economics'
                ]
            }
        ];

        console.log('Seeding faculties and departments...');
        
        let firstFacultyId = null;
        let firstDepartmentId = null;
        
        for (const fac of faculties) {
            const [faculty] = await db.Faculty.findOrCreate({
                where: { name: fac.name }
            });

            if (!firstFacultyId) {
                firstFacultyId = faculty.id;
            }

            for (const deptName of fac.departments) {
                const [dept] = await db.Department.findOrCreate({
                    where: { name: deptName, faculty_id: faculty.id }
                });
                
                if (!firstDepartmentId) {
                    firstDepartmentId = dept.id;
                }
            }
        }

        console.log('Seeding sample users...');
        
        // Create a system admin
        const adminPassword = await bcrypt.hash('admin123', 10);
        const [admin] = await db.User.findOrCreate({
            where: { email: 'admin@ucu.ac.ug' },
            defaults: {
                name: 'System Administrator',
                password: adminPassword,
                role: 'admin',
                faculty_id: firstFacultyId,
                department_id: firstDepartmentId
            }
        });
        // Update password in case user already existed
        await admin.update({ password: adminPassword, faculty_id: firstFacultyId, department_id: firstDepartmentId });
        
        // Create a faculty admin for Engineering (Faculty ID 2)
        const engineeringFaculty = await db.Faculty.findOne({ where: { name: 'Faculty of Engineering, Design & Technology' } });
        const engineeringDept = await db.Department.findOne({ where: { faculty_id: engineeringFaculty.id } });
        
        const facultyAdminPassword = await bcrypt.hash('admin123', 10);
        const [facultyAdmin] = await db.User.findOrCreate({
            where: { email: 'faculty@ucu.ac.ug' },
            defaults: {
                name: 'Faculty Admin',
                password: facultyAdminPassword,
                role: 'faculty_admin',
                faculty_id: engineeringFaculty.id,
                department_id: engineeringDept.id
            }
        });
        await facultyAdmin.update({ password: facultyAdminPassword, faculty_id: engineeringFaculty.id, department_id: engineeringDept.id });
        
        // Create a supervisor
        const supervisorPassword = await bcrypt.hash('admin123', 10);
        const [supervisor] = await db.User.findOrCreate({
            where: { email: 'supervisor@ucu.ac.ug' },
            defaults: {
                name: 'Dr. Jane Smith',
                password: supervisorPassword,
                role: 'supervisor',
                faculty_id: engineeringFaculty.id,
                department_id: engineeringDept.id
            }
        });
        await supervisor.update({ password: supervisorPassword, faculty_id: engineeringFaculty.id, department_id: engineeringDept.id });
        
        // Create a student
        const studentPassword = await bcrypt.hash('admin123', 10);
        const [student] = await db.User.findOrCreate({
            where: { email: 'student@ucu.ac.ug' },
            defaults: {
                name: 'John Doe',
                password: studentPassword,
                role: 'student',
                faculty_id: engineeringFaculty.id,
                department_id: engineeringDept.id
            }
        });
        await student.update({ password: studentPassword, faculty_id: engineeringFaculty.id, department_id: engineeringDept.id });

        console.log('Database seeded successfully!');
        console.log('\nSample Credentials (All use password: admin123):');
        console.log('==================');
        console.log('System Admin: admin@ucu.ac.ug');
        console.log('Faculty Admin: faculty@ucu.ac.ug');
        console.log('Supervisor: supervisor@ucu.ac.ug');
        console.log('Student: student@ucu.ac.ug');
        
        // Verify admin user
        const adminUser = await db.User.findOne({ where: { email: 'admin@ucu.ac.ug' } });
        console.log('\nAdmin user check:');
        console.log('Email:', adminUser?.email);
        console.log('Role:', adminUser?.role);
        console.log('Has password:', !!adminUser?.password);
        
        console.log('\nFaculty Admin check:');
        const facultyAdminUser = await db.User.findOne({ 
            where: { email: 'faculty@ucu.ac.ug' },
            include: [{ model: db.Faculty }, { model: db.Department }]
        });
        console.log('Email:', facultyAdminUser?.email);
        console.log('Faculty:', facultyAdminUser?.Faculty?.name);
        console.log('Department:', facultyAdminUser?.Department?.name);
        
        // Show departments count
        const deptCount = await db.Department.count({ where: { faculty_id: facultyAdminUser.faculty_id } });
        console.log('Departments in faculty:', deptCount);
        
        process.exit();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
