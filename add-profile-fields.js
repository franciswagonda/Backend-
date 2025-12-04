const dotenv = require('dotenv');
dotenv.config();

const db = require('./models');

async function addProfileFields() {
    try {
        const queryInterface = db.sequelize.getQueryInterface();
        
        // Get existing columns
        const tableDescription = await queryInterface.describeTable('Users');
        
        // List of new columns to add
        const columnsToAdd = {
            profilePhotoUrl: {
                type: db.Sequelize.STRING,
                allowNull: true
            },
            registrationNumber: {
                type: db.Sequelize.STRING,
                allowNull: true
            },
            yearOfEntry: {
                type: db.Sequelize.INTEGER,
                allowNull: true
            },
            gender: {
                type: db.Sequelize.ENUM('MALE', 'FEMALE', 'OTHER'),
                allowNull: true
            },
            nationality: {
                type: db.Sequelize.STRING,
                allowNull: true,
                defaultValue: 'Ugandan'
            },
            phoneNumber: {
                type: db.Sequelize.STRING,
                allowNull: true
            },
            otherNames: {
                type: db.Sequelize.STRING,
                allowNull: true
            },
            department: {
                type: db.Sequelize.STRING,
                allowNull: true
            },
            hobbies: {
                type: db.Sequelize.TEXT,
                allowNull: true
            }
        };
        
        // Add each column if it doesn't exist
        for (const [columnName, columnDef] of Object.entries(columnsToAdd)) {
            if (!tableDescription[columnName]) {
                console.log(`Adding column: ${columnName}`);
                await queryInterface.addColumn('Users', columnName, columnDef);
                console.log(`✓ Added column: ${columnName}`);
            } else {
                console.log(`✓ Column already exists: ${columnName}`);
            }
        }
        
        console.log('\n✅ Profile fields migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

addProfileFields();

