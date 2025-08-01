import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { currentUser, userProfile, loading, hasRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while authentication is being verified
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }} color="text.secondary">
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !userProfile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if specific roles are required
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        textAlign="center"
        p={3}
      >
        <Typography variant="h4" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You don't have the required permissions to access this page.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Required role(s): {requiredRoles.join(', ')}
          <br />
          Your role: {userProfile.role}
        </Typography>
      </Box>
    );
  }

  // Render children if authenticated and authorized
  return children;
};

export default ProtectedRoute;