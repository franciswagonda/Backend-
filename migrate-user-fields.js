// Migration script to add new profile fields to Users table
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: console.log
    }
);

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Check which columns already exist
        const [columns] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
            AND TABLE_NAME = 'Users'
        `);
        
        const existingColumns = columns.map(c => c.COLUMN_NAME);
        console.log('Existing columns:', existingColumns);

        // Define new columns to add
        const newColumns = [
            { name: 'registrationNumber', sql: 'registrationNumber VARCHAR(255) DEFAULT NULL' },
            { name: 'yearOfEntry', sql: 'yearOfEntry INT DEFAULT NULL' },
            { name: 'gender', sql: "gender ENUM('MALE', 'FEMALE', 'OTHER') DEFAULT NULL" },
            { name: 'nationality', sql: "nationality VARCHAR(255) DEFAULT 'Ugandan'" },
            { name: 'phoneNumber', sql: 'phoneNumber VARCHAR(255) DEFAULT NULL' },
            { name: 'otherNames', sql: 'otherNames VARCHAR(255) DEFAULT NULL' },
            { name: 'department', sql: 'department VARCHAR(255) DEFAULT NULL' },
            { name: 'hobbies', sql: 'hobbies TEXT DEFAULT NULL' }
        ];

        for (const col of newColumns) {
            if (!existingColumns.includes(col.name)) {
                try {
                    console.log(`Adding column: ${col.name}`);
                    await sequelize.query(`ALTER TABLE Users ADD COLUMN ${col.sql}`);
                    console.log(`✓ Added ${col.name}`);
                } catch (err) {
                    console.error(`✗ Error adding ${col.name}:`, err.message);
                }
            } else {
                console.log(`✓ Column ${col.name} already exists, skipping`);
            }
        }

        console.log('\n✓ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
