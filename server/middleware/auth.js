const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

/**
 * Middleware to verify Firebase authentication token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'No token provided or invalid format',
          code: 'AUTH_TOKEN_MISSING'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user record to check custom claims and status
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    
    // Check if user is disabled
    if (userRecord.disabled) {
      return res.status(403).json({
        error: {
          message: 'User account is disabled',
          code: 'USER_DISABLED'
        }
      });
    }

    // Attach user information to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userRecord.customClaims?.role || 'viewer',
      name: userRecord.displayName || decodedToken.name,
      emailVerified: decodedToken.email_verified
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: {
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: {
          message: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        }
      });
    }

    return res.status(401).json({
      error: {
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      }
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRole: allowedRoles,
          userRole: req.user.role
        }
      });
    }

    next();
  };
};

/**
 * Middleware to require engineer role or higher
 */
const requireEngineer = requireRole(['engineer', 'admin']);

/**
 * Middleware to require admin role
 */
const requireAdmin = requireRole(['admin']);

/**
 * Helper function to set custom claims for a user
 * @param {string} uid - User ID
 * @param {object} claims - Custom claims to set
 */
const setUserClaims = async (uid, claims) => {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    return { success: true };
  } catch (error) {
    console.error('Error setting user claims:', error);
    throw error;
  }
};

/**
 * Helper function to create a new user with role
 * @param {object} userData - User data
 */
const createUserWithRole = async (userData) => {
  try {
    const userRecord = await admin.auth().createUser({
      email: userData.email,
      displayName: userData.name,
      password: userData.password,
      emailVerified: false
    });

    // Set custom claims
    await setUserClaims(userRecord.uid, {
      role: userData.role || 'viewer'
    });

    return userRecord;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

module.exports = {
  verifyToken,
  requireRole,
  requireEngineer,
  requireAdmin,
  setUserClaims,
  createUserWithRole,
  admin
};