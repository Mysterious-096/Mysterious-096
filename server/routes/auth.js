const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, requireAdmin, setUserClaims, createUserWithRole, admin } = require('../middleware/auth');
const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new engineer (Admin only)
 * @access  Private (Admin)
 */
router.post('/register', [
  verifyToken,
  requireAdmin,
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['engineer', 'admin', 'viewer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { email, name, password, role } = req.body;

    // Check if user already exists
    try {
      await admin.auth().getUserByEmail(email);
      return res.status(400).json({
        error: {
          message: 'User with this email already exists'
        }
      });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create user
    const userRecord = await createUserWithRole({
      email,
      name,
      password,
      role
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        role: role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create user',
        details: error.message
      }
    });
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify user token and get user info
 * @access  Private
 */
router.post('/verify-token', verifyToken, async (req, res) => {
  try {
    res.json({
      user: req.user,
      message: 'Token is valid'
    });
  } catch (error) {
    res.status(401).json({
      error: {
        message: 'Invalid token'
      }
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);
    
    res.json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        role: userRecord.customClaims?.role || 'viewer',
        emailVerified: userRecord.emailVerified,
        createdAt: userRecord.metadata.creationTime,
        lastSignIn: userRecord.metadata.lastSignInTime
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch profile'
      }
    });
  }
});

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers();
    
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      role: user.customClaims?.role || 'viewer',
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime
    }));

    res.json({
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch users'
      }
    });
  }
});

/**
 * @route   PUT /api/auth/users/:uid/role
 * @desc    Update user role (Admin only)
 * @access  Private (Admin)
 */
router.put('/users/:uid/role', [
  verifyToken,
  requireAdmin,
  body('role').isIn(['engineer', 'admin', 'viewer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { uid } = req.params;
    const { role } = req.body;

    // Check if user exists
    const userRecord = await admin.auth().getUser(uid);
    
    // Update custom claims
    await setUserClaims(uid, { role });

    res.json({
      message: 'User role updated successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        role: role
      }
    });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update user role'
      }
    });
  }
});

/**
 * @route   PUT /api/auth/users/:uid/disable
 * @desc    Disable/Enable user (Admin only)
 * @access  Private (Admin)
 */
router.put('/users/:uid/disable', [
  verifyToken,
  requireAdmin,
  body('disabled').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { uid } = req.params;
    const { disabled } = req.body;

    // Update user status
    const userRecord = await admin.auth().updateUser(uid, { disabled });

    res.json({
      message: `User ${disabled ? 'disabled' : 'enabled'} successfully`,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        disabled: userRecord.disabled
      }
    });
  } catch (error) {
    console.error('User status update error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update user status'
      }
    });
  }
});

/**
 * @route   DELETE /api/auth/users/:uid
 * @desc    Delete user (Admin only)
 * @access  Private (Admin)
 */
router.delete('/users/:uid', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;

    // Prevent admin from deleting themselves
    if (uid === req.user.uid) {
      return res.status(400).json({
        error: {
          message: 'Cannot delete your own account'
        }
      });
    }

    await admin.auth().deleteUser(uid);

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete user'
      }
    });
  }
});

/**
 * @route   POST /api/auth/send-password-reset
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/send-password-reset', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Invalid email format'
        }
      });
    }

    const { email } = req.body;

    // Check if user exists (optional - for security, you might want to always return success)
    try {
      await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // For security reasons, don't reveal if user exists
        return res.json({
          message: 'If the email exists, a password reset link has been sent'
        });
      }
      throw error;
    }

    // Note: Password reset emails are typically sent from the client-side
    // This endpoint is mainly for validation and logging
    res.json({
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to process password reset request'
      }
    });
  }
});

/**
 * @route   GET /api/auth/stats
 * @desc    Get authentication statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(user => !user.disabled).length,
      disabledUsers: users.filter(user => user.disabled).length,
      verifiedUsers: users.filter(user => user.emailVerified).length,
      roleBreakdown: {
        admin: users.filter(user => user.customClaims?.role === 'admin').length,
        engineer: users.filter(user => user.customClaims?.role === 'engineer').length,
        viewer: users.filter(user => !user.customClaims?.role || user.customClaims?.role === 'viewer').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch authentication statistics'
      }
    });
  }
});

module.exports = router;