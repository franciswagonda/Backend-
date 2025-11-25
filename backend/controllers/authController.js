const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const User = db.User;

// Admin-only User Provisioning (Registration removed from public access)
exports.register = async (req, res) => {
    try {
        // Require authenticated admin or faculty_admin
        if (!req.user || !['admin', 'faculty_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admins or faculty admins can create users' });
        }

        let { name, email, password, role, faculty_id, department_id } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }
        
        // Faculty admins can only create users in their own faculty
        if (req.user.role === 'faculty_admin') {
            faculty_id = req.user.faculty_id;
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: finalRole,
            faculty_id,
            department_id
        });

        // No automatic login token returned (admin provisioning context)
        res.status(201).json({
            message: 'User provisioned successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.active) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
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
                role: user.role,
                active: user.active
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Request Password Reset
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const hashedToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');

        // Set token and expiry (1 hour)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        // Configure email transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

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
