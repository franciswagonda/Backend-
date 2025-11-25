const db = require('./models');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        await db.sequelize.sync();

        const faculties = [
            {
                name: 'Faculty of Engineering, Design and Technology',
                departments: ['Department of Computing & Technology', 'Department of Engineering']
            },
            {
                name: 'Faculty of Business & Administration',
                departments: ['Department of Business', 'Department of Economics']
            },
            {
                name: 'Faculty of Law',
                departments: ['Department of Law']
            }
        ];

        console.log('Seeding faculties and departments...');
        
        for (const fac of faculties) {
            const [faculty] = await db.Faculty.findOrCreate({
                where: { name: fac.name }
            });

            for (const deptName of fac.departments) {
                await db.Department.findOrCreate({
                    where: { name: deptName, faculty_id: faculty.id }
                });
            }
        }

        console.log('Seeding sample users...');
        
        // Create a system admin
        const adminPassword = await bcrypt.hash('admin123', 10);
        await db.User.findOrCreate({
            where: { email: 'admin@ucu.ac.ug' },
            defaults: {
                name: 'System Administrator',
                password: adminPassword,
                role: 'admin',
                faculty_id: 1,
                department_id: 1
            }
        });
        
        // Create a faculty admin for Engineering
        const facultyAdminPassword = await bcrypt.hash('faculty123', 10);
        await db.User.findOrCreate({
            where: { email: 'engineering.admin@ucu.ac.ug' },
            defaults: {
                name: 'Engineering Faculty Admin',
                password: facultyAdminPassword,
                role: 'faculty_admin',
                faculty_id: 1,
                department_id: 1
            }
        });
        
        // Create a supervisor
        const supervisorPassword = await bcrypt.hash('supervisor123', 10);
        await db.User.findOrCreate({
            where: { email: 'supervisor@ucu.ac.ug' },
            defaults: {
                name: 'Dr. Jane Smith',
                password: supervisorPassword,
                role: 'supervisor',
                faculty_id: 1,
                department_id: 1
            }
        });
        
        // Create a student
        const studentPassword = await bcrypt.hash('student123', 10);
        await db.User.findOrCreate({
            where: { email: 'student@ucu.ac.ug' },
            defaults: {
                name: 'John Doe',
                password: studentPassword,
                role: 'student',
                faculty_id: 1,
                department_id: 1
            }
        });

        console.log('Database seeded successfully!');
        console.log('\nSample Credentials:');
        console.log('==================');
        console.log('System Admin: admin@ucu.ac.ug / admin123');
        console.log('Faculty Admin: engineering.admin@ucu.ac.ug / faculty123');
        console.log('Supervisor: supervisor@ucu.ac.ug / supervisor123');
        console.log('Student: student@ucu.ac.ug / student123');
        
        process.exit();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
