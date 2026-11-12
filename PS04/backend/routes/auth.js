const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper to ensure default Administrator exists in database
 */
async function seedDefaultAdmin() {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const defaultEmail = 'admin@gmail.com';
      const existingUser = await User.findOne({ email: defaultEmail });
      const hashedPassword = await bcrypt.hash('admin123', 10);

      if (existingUser) {
        existingUser.role = 'admin';
        existingUser.allowedTabs = ['*'];
        existingUser.password = hashedPassword;
        await existingUser.save();
        console.log('👑 Existing user promoted to default SuperAdmin (admin@gmail.com)');
      } else {
        await User.create({
          email: defaultEmail,
          password: hashedPassword,
          name: 'Campus SuperAdmin',
          role: 'admin',
          allowedTabs: ['*'],
          isActive: true,
        });
        console.log('👑 Default Admin created: admin@gmail.com / admin123');
      }
    }
  } catch (err) {
    console.error('⚠️ Error seeding default admin:', err.message);
  }
}

/**
 * POST /api/auth/login
 * Authenticate user or admin, return signed JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { idOrEmail, email, password } = req.body;
    const inputIdentifier = (idOrEmail || email || '').trim().toLowerCase();
    const inputPassword = (password || '').trim();

    if (!inputIdentifier || !inputPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both User ID / Email and Password.',
      });
    }

    // Auto-normalize if user typed just username (e.g. "admin" -> "admin@gmail.com")
    const resolvedEmail = inputIdentifier.includes('@')
      ? inputIdentifier
      : `${inputIdentifier}@gmail.com`;

    let user = await User.findOne({
      $or: [
        { email: resolvedEmail },
        { email: inputIdentifier },
      ],
    });

    // If database has no admin yet and user logs in with admin@gmail.com / admin123
    if (!user && (resolvedEmail === 'admin@gmail.com' || inputIdentifier === 'admin') && inputPassword === 'admin123') {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      user = await User.create({
        email: 'admin@gmail.com',
        password: hashedPassword,
        name: 'Campus SuperAdmin',
        role: 'admin',
        allowedTabs: ['*'],
        isActive: true,
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an Administrator.',
      });
    }

    // Validate password (supports bcrypt and upgrades legacy plain text)
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(inputPassword, user.password);
    } else {
      isMatch = user.password === inputPassword;
      if (isMatch) {
        // Upgrade plain text to bcrypt
        user.password = await bcrypt.hash(inputPassword, 10);
        await user.save();
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    // Generate JWT token
    const tokenPayload = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      allowedTabs: user.allowedTabs,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login: ' + err.message });
  }
});

/**
 * GET /api/auth/me
 * Validate current JWT and return current user profile
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, message: 'User not found or account deactivated.' });
    }
    res.json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/auth/admin/credentials
 * Update Admin Login ID, Name, and Password
 * Restricted to administrators
 */
router.put('/admin/credentials', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { newEmail, newPassword, newName, currentPassword } = req.body;
    const admin = await User.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    // If current password provided, verify it
    if (currentPassword) {
      const match = await bcrypt.compare(currentPassword, admin.password);
      if (!match && admin.password !== currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password does not match.' });
      }
    }

    // Update Email / Login ID
    if (newEmail && newEmail.trim()) {
      const normalizedEmail = newEmail.trim().toLowerCase();
      const resolved = normalizedEmail.includes('@') ? normalizedEmail : `${normalizedEmail}@gmail.com`;

      // Check uniqueness if email changed
      if (resolved !== admin.email) {
        const existing = await User.findOne({ email: resolved });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `User with email/ID "${resolved}" already exists.`,
          });
        }
        admin.email = resolved;
      }
    }

    // Update Display Name
    if (newName && newName.trim()) {
      admin.name = newName.trim();
    }

    // Update Password
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 4 characters long.',
        });
      }
      admin.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    await admin.save();

    // Re-issue a fresh JWT with updated info
    const tokenPayload = {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      allowedTabs: admin.allowedTabs,
    };
    const freshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Admin credentials successfully updated.',
      token: freshToken,
      user: admin.toSafeObject(),
    });
  } catch (err) {
    console.error('Update admin error:', err);
    res.status(500).json({ success: false, message: 'Failed to update credentials: ' + err.message });
  }
});

/**
 * GET /api/auth/users
 * List all users (Admin only)
 */
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      users: users.map((u) => u.toSafeObject()),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/users
 * Create a new user with specific role and granular tab access permissions (Admin only)
 */
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role = 'operator', allowedTabs = ['overview'] } = req.body;

    const trimmedInput = (email || '').trim().toLowerCase();
    const trimmedPass = (password || '').trim();

    if (!trimmedInput || !trimmedPass) {
      return res.status(400).json({
        success: false,
        message: 'User ID / Email and Password are required.',
      });
    }

    if (trimmedPass.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters.',
      });
    }

    const resolvedEmail = trimmedInput.includes('@') ? trimmedInput : `${trimmedInput}@gmail.com`;

    const existing = await User.findOne({ email: resolvedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A user with ID/email "${resolvedEmail}" already exists.`,
      });
    }

    const hashedPassword = await bcrypt.hash(trimmedPass, 10);
    const resolvedRole = ['admin', 'operator', 'manager', 'viewer', 'user'].includes(role)
      ? role
      : 'operator';

    // If role is admin, automatically grant full tab access
    const finalTabs = resolvedRole === 'admin'
      ? ['*']
      : Array.isArray(allowedTabs) && allowedTabs.length > 0
        ? allowedTabs
        : ['overview'];

    const newUser = await User.create({
      email: resolvedEmail,
      password: hashedPassword,
      name: name && name.trim() ? name.trim() : resolvedEmail.split('@')[0],
      role: resolvedRole,
      allowedTabs: finalTabs,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: `User "${newUser.email}" successfully created with access to: ${finalTabs.join(', ')}.`,
      user: newUser.toSafeObject(),
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user: ' + err.message });
  }
});

/**
 * PUT /api/auth/users/:id
 * Update user details, role, tab permissions, active status, or password (Admin only)
 */
router.put('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, allowedTabs, isActive, password, email } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (email && email.trim()) {
      const normalized = email.trim().toLowerCase();
      const resolved = normalized.includes('@') ? normalized : `${normalized}@gmail.com`;
      if (resolved !== user.email) {
        const clash = await User.findOne({ email: resolved });
        if (clash) {
          return res.status(400).json({ success: false, message: `Email "${resolved}" is already taken.` });
        }
        user.email = resolved;
      }
    }

    if (name !== undefined) user.name = name.trim();
    if (role && ['admin', 'operator', 'manager', 'viewer', 'user'].includes(role)) {
      user.role = role;
    }

    if (Array.isArray(allowedTabs)) {
      user.allowedTabs = user.role === 'admin' ? ['*'] : allowedTabs;
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    if (password && password.trim()) {
      if (password.trim().length < 4) {
        return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' });
      }
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    res.json({
      success: true,
      message: `User "${user.email}" updated successfully.`,
      user: user.toSafeObject(),
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user: ' + err.message });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Delete a user (Admin only)
 */
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent deleting oneself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own logged-in admin account.',
      });
    }

    // Ensure at least one active admin remains
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the sole Administrator account.',
        });
      }
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `User "${user.email}" deleted successfully.`,
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user: ' + err.message });
  }
});

module.exports = {
  router,
  seedDefaultAdmin,
};

