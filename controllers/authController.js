const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const User = db.User;

// Helpers
function generateRandomPassword(length = 10) {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // 4 random digits
    return `Changemenow@${randomNumbers}`;
}

async function getFacultyPrefixById(faculty_id) {
    try {
        const faculty = await db.Faculty.findByPk(faculty_id);
        const name = faculty?.name || '';
        if (/Agricultural Sciences/i.test(name)) return 'A';
        if (/Engineering.*Design.*Technology/i.test(name)) return 'B';
        if (/(Public Health|Nursing|Midwifery)/i.test(name)) return 'C';
        return 'U';
    } catch {
        return 'U';
    }
}
C
async function generateUniqueAccessNumber(faculty_id) {
    const prefix = await getFacultyPrefixById(faculty_id);
    let accessNumber;
    // Try up to 10 times to avoid rare collisions
    for (let i = 0; i < 10; i++) {
        const num = Math.floor(100000 + Math.random() * 900000); // 6 digits
        accessNumber = `${prefix}${num}`; // e.g., A123456
        const exists = await User.findOne({ where: { accessNumber } });
        if (!exists) break;
    }
    return accessNumber;
}

function buildTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: String(process.env.SMTP_PORT) === '465',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
}

// Admin-only User Provisioning (Registration removed from public access)
exports.register = async (req, res) => {
    try {
        // Require authenticated admin or faculty_admin
        if (!req.user || !['admin', 'faculty_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admins or faculty admins can create users' });
        }

        let { name, email, role, faculty_id, department_id, alternativeEmail } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }
        
        // Convert empty strings to null for integer fields
        faculty_id = faculty_id && faculty_id !== '' ? faculty_id : null;
        department_id = department_id && department_id !== '' ? department_id : null;
        
        // Faculty admins can only create users in their own faculty
        // Note: JWT does not include faculty_id, so fetch creator from DB
        if (req.user.role === 'faculty_admin') {
            const creator = await User.findByPk(req.user.id);
            faculty_id = creator?.faculty_id || faculty_id;
        }

        // Ensure faculty_id is provided
        if (!faculty_id) {
            return res.status(400).json({ message: 'Faculty is required' });
        }

        // Role restrictions based on who's creating the user
        let allowedRoles = ['student', 'supervisor'];
        if (req.user.role === 'admin') {
            allowedRoles = ['student', 'supervisor', 'admin', 'faculty_admin'];
        }
        const finalRole = allowedRoles.includes(role) ? role : 'student';

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const tempPassword = generateRandomPassword(10);
        let accessNumber = null;
        if (finalRole === 'student') {
            accessNumber = await generateUniqueAccessNumber(faculty_id);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const user = await User.create({
            name,
            email,
            accessNumber,
            password: hashedPassword,
            role: finalRole,
            faculty_id,
            department_id
        });

        console.log('User created successfully:', user.id, user.email);

        // Send welcome email with credentials
        let emailSent = false;
        try {
            const transporter = buildTransporter();
            const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
            let emailHtml = `<div style="font-family: Arial, sans-serif;">
                <h2 style="margin:0">Welcome to UCU Innovators Hub</h2>
                <p>Your account has been created by your ${req.user.role === 'admin' ? 'system administrator' : 'faculty administrator'}.</p>
                <p><strong>UCU Email (for login):</strong> ${email}<br/>
                <strong>Temporary Password:</strong> ${tempPassword}</p>`;
            if (finalRole === 'student') {
                emailHtml += `<p><strong>Access Number (alternative login):</strong> ${accessNumber}</p>`;
            }
            emailHtml += `<p><a href="${loginUrl}" style="background:#e91e63;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Sign in</a></p>
                <p><strong>Important:</strong> Please change your password after signing in.</p>
            </div>`;
            
            // Send to alternative email if provided, otherwise to UCU email
            const recipientEmail = alternativeEmail || email;
            
            console.log('Attempting to send email to:', recipientEmail);
            
            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'UCU Innovators Hub <noreply@ucu.ac.ug>',
                to: recipientEmail,
                subject: 'Your UCU Innovators Hub Account',
                html: emailHtml
            });
            emailSent = true;
            console.log('Email sent successfully to:', recipientEmail);
        } catch (e) {
            console.error('Welcome email failed:', e.message);
            console.error('Email config check - SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
            console.error('Email config check - SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');
            // Continue even if email fails - user is already created
        }

        res.status(201).json({
            message: emailSent 
                ? 'User provisioned successfully and credentials sent via email' 
                : 'User provisioned successfully, but email notification failed. Please provide credentials manually.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                accessNumber: user.accessNumber
            },
            emailSent,
            // Only include password in response if email failed (for admin to manually share)
            ...(emailSent ? {} : { tempPassword })
        });
    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Server error during user creation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Login User (email for staff, access number for students)
exports.login = async (req, res) => {
    try {
        let { identifier, password } = req.body;
        identifier = identifier?.trim();
        console.log('Login attempt with identifier:', identifier);
        
        if (!identifier || !password) {
            return res.status(400).json({ message: 'Login credentials are required' });
        }

        // Try to find user by email first (for staff), then by access number (for students)
        let user = await User.findOne({ where: { email: identifier } });
        if (!user) {
            user = await User.findOne({ where: { accessNumber: identifier } });
        }

        if (!user) {
            console.log('User not found for identifier:', identifier);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('User found:', user.email, 'Role:', user.role);

        if (!user.active) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                accessNumber: user.accessNumber,
                role: user.role,
                active: user.active,
                faculty_id: user.faculty_id,
                department_id: user.department_id
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Request Password Reset (access number input, email delivery)
exports.requestPasswordReset = async (req, res) => {
    try {
        const { accessNumber } = req.body;

        if (!accessNumber) {
            return res.status(400).json({ message: 'Access number is required' });
        }

        const user = await User.findOne({ where: { accessNumber } });
        if (!user) {
            // Don't reveal if user exists
            return res.json({ message: 'If an account exists, a password reset link has been sent.' });
        }

        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const hashedToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000);
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        const transporter = buildTransporter();

        // Email content
        const mailOptions = {
            from: process.env.SMTP_FROM || 'UCU Innovators Hub <noreply@ucu.ac.ug>',
            to: user.email,
            subject: 'Password Reset Request - UCU Innovators Hub',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Aptos', Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #051738ff 0%, #42022aff 50%, #1e1f72ff 100%); color: white; padding: 30px; text-align: center; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }
                        .button { display: inline-block; background: #e91e63; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>UGANDA CHRISTIAN UNIVERSITY</h1>
                            <p>Innovators Hub</p>
                        </div>
                        <div class="content">
                            <h2>Password Reset Request</h2>
                            <p>Hello ${user.name},</p>
                            <p>We received a request to reset your password for your UCU Innovators Hub account.</p>
                            <p>Click the button below to reset your password:</p>
                            <a href="${resetUrl}" class="button">Reset Password</a>
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                            <p><strong>This link will expire in 1 hour.</strong></p>
                            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2025 Uganda Christian University - A Centre of Excellence</p>
                            <p>P.O. Box 4, Mukono, Uganda | Email: info@ucu.ac.ug</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        // Send email
        try {
            await transporter.sendMail(mailOptions);
            res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Clear the reset token if email fails
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();
            res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Hash the token from URL to compare with stored hash
        const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { [db.Sequelize.Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        
        // Clear reset token fields
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({ message: 'Password reset successful. You can now login with your new password.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Change Password (authenticated user)
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
