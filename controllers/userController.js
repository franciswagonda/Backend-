const db = require('../models');
const bcrypt = require('bcryptjs');
const User = db.User;
const Faculty = db.Faculty;
const Department = db.Department;
const path = require('path');
const uploadImage = require('../middleware/imageUploadMiddleware');


















// Ensure requester is admin or faculty_admin
function requireAdminOrFacultyAdmin(req, res) {
  if (!req.user || !['admin', 'faculty_admin'].includes(req.user.role)) {
    res.status(403).json({ message: 'Admin or Faculty Admin privileges required' });
    return false;
  }
  return true;
}

// List users (optional filters by role, faculty, department)
exports.listUsers = async (req, res) => {
  try {
    if (!requireAdminOrFacultyAdmin(req, res)) return;

    const { role, faculty_id, department_id, include_inactive } = req.query;
    const where = {};

    // Faculty admins: restrict to their own faculty (fetched from DB to ensure we have it)
    if (req.user.role === 'faculty_admin') {
      const currentUser = await User.findByPk(req.user.id);
      if (currentUser && currentUser.faculty_id != null) {
        where.faculty_id = currentUser.faculty_id;
      }
    }

    // Admin can optionally filter by faculty_id from query
    if (faculty_id && req.user.role === 'admin') {
      where.faculty_id = faculty_id;
    }

    if (role) where.role = role;
    if (department_id) where.department_id = department_id;
    if (!include_inactive) where.active = true;

    // Remove undefined filters defensively
    Object.keys(where).forEach(key => {
      if (where[key] === undefined) delete where[key];
    });

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Faculty, attributes: ['id', 'name'] },
        { model: Department, attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    if (!requireAdminOrFacultyAdmin(req, res)) return;
    const user = await User.findByPk(req.params.id, { 
      attributes: { exclude: ['password'] },
      include: [
        { model: Faculty, attributes: ['id', 'name'] },
        { model: Department, attributes: ['id', 'name'] }
      ]
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Faculty admins can only view users in their faculty
    if (req.user.role === 'faculty_admin' && user.faculty_id !== req.user.faculty_id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create user (alternative to /auth/register) - expects name,email,password,role
exports.createUser = async (req, res) => {
  try {
    if (!requireAdminOrFacultyAdmin(req, res)) return;
    let { name, email, password, role, faculty_id, department_id } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password required' });
    }
    
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already in use' });
    
    // Faculty admins can only create students and supervisors in their faculty
    if (req.user.role === 'faculty_admin') {
      faculty_id = req.user.faculty_id; // Force same faculty
      const allowedRoles = ['student', 'supervisor'];
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'Faculty admins can only create students and supervisors' });
      }
    }
    
    // Admins can create any role
    const allowedRoles = req.user.role === 'admin' 
      ? ['student', 'supervisor', 'admin', 'faculty_admin']
      : ['student', 'supervisor'];
    const finalRole = allowedRoles.includes(role) ? role : 'student';
    
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashed, role: finalRole, faculty_id, department_id });
    
    res.status(201).json({
      message: 'User created',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, faculty_id: user.faculty_id }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user (role, faculty, department, name). Password change optional.
exports.updateUser = async (req, res) => {
  try {
    if (!requireAdminOrFacultyAdmin(req, res)) return;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Faculty admins can only update users in their faculty
    if (req.user.role === 'faculty_admin') {
      if (user.faculty_id !== req.user.faculty_id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    const { name, role, faculty_id, department_id, password } = req.body;
    if (name) user.name = name;
    
    // Role restrictions
    if (role) {
      if (req.user.role === 'faculty_admin') {
        // Faculty admins can only set student or supervisor roles
        if (!['student', 'supervisor'].includes(role)) {
          return res.status(403).json({ message: 'Faculty admins can only assign student or supervisor roles' });
        }
      }
      const allowedRoles = req.user.role === 'admin'
        ? ['student', 'supervisor', 'admin', 'faculty_admin']
        : ['student', 'supervisor'];
      if (allowedRoles.includes(role)) user.role = role;
    }
    
    // Faculty admins cannot change faculty
    if (faculty_id !== undefined && req.user.role === 'admin') {
      user.faculty_id = faculty_id;
    }
    
    if (department_id !== undefined) user.department_id = department_id;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    
    await user.save();
    res.json({ message: 'User updated', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    if (!requireAdminOrFacultyAdmin(req, res)) return;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Faculty admins can only deactivate users in their faculty
    if (req.user.role === 'faculty_admin') {
      // Fetch current user from DB to get faculty_id
      const currentUser = await User.findByPk(req.user.id);
      if (user.faculty_id !== currentUser.faculty_id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      // Faculty admins cannot delete other admins or faculty admins
      if (['admin', 'faculty_admin'].includes(user.role)) {
        return res.status(403).json({ message: 'Cannot deactivate admin users' });
      }
    }
    
    if (!user.active) return res.status(400).json({ message: 'User already deactivated' });
    user.active = false;
    await user.save();
    res.json({ message: 'User deactivated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reactivate user
exports.reactivateUser = async (req, res) => {
  try {
    if (!requireAdminOrFacultyAdmin(req, res)) return;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Faculty admins can only reactivate users in their faculty
    if (req.user.role === 'faculty_admin') {
      // Fetch current user from DB to get faculty_id
      const currentUser = await User.findByPk(req.user.id);
      if (user.faculty_id !== currentUser.faculty_id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    if (user.active) return res.status(400).json({ message: 'User already active' });
    user.active = true;
    await user.save();
    res.json({ message: 'User reactivated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user's profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update current user's profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('Profile update request from user:', req.user.id);
    console.log('Request body:', req.body);
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Allow updating specific fields
    const allowedFields = [
      'name', 'phoneNumber', 'otherNames', 'nationality', 
      'gender', 'hobbies', 'department', 'registrationNumber', 'yearOfEntry'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Handle yearOfEntry - only allow for students, convert empty string to null
        if (field === 'yearOfEntry') {
          if (user.role === 'student') {
            user[field] = req.body[field] === '' ? null : req.body[field];
          }
          // For non-students, ignore yearOfEntry field
        } else if (field === 'registrationNumber') {
          // Only allow registration number for students
          if (user.role === 'student') {
            user[field] = req.body[field] === '' ? null : req.body[field];
          }
        } else {
          // For all other fields, convert empty string to null
          user[field] = req.body[field] === '' ? null : req.body[field];
        }
      }
    });

    await user.save();
    console.log('Profile updated successfully for user:', req.user.id);

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
    });

    res.json(updatedUser);
  } catch (e) {
    console.error('Error updating profile:', e);
    console.error('Error details:', e.message);
    res.status(500).json({ message: 'Server error: ' + e.message });
  }
};

// Upload/update current user's profile photo
exports.updateProfilePhoto = async (req, res) => {
  uploadImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err });
    }

    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No photo uploaded' });
      }

      const relativeUrl = `/uploads/${req.file.filename}`;
      user.profilePhotoUrl = relativeUrl;
      await user.save();

      return res.json({ profilePhotoUrl: relativeUrl });
    } catch (e) {
      console.error('Error updating profile photo:', e);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};
