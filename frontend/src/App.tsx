import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Box, Spinner, Flex } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './context/AuthContext';
// Lazy-loaded route components for performance and code-splitting
const LoginPage = React.lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const ProductionDashboardPage = React.lazy(() =>
  import('./pages/ProductionDashboardPage').then((m) => ({ default: m.ProductionDashboardPage }))
);
const InspectorDashboardPage = React.lazy(() =>
  import('./pages/InspectorDashboardPage').then((m) => ({ default: m.InspectorDashboardPage }))
);
const RequestsListPage = React.lazy(() =>
  import('./pages/RequestsListPage').then((m) => ({ default: m.RequestsListPage }))
);
const RequestDetailPage = React.lazy(() =>
  import('./pages/RequestDetailPage').then((m) => ({ default: m.RequestDetailPage }))
);
const ReportEntryPage = React.lazy(() =>
  import('./pages/ReportEntryPage').then((m) => ({ default: m.ReportEntryPage }))
);
const PartMasterPage = React.lazy(() =>
  import('./pages/PartMasterPage').then((m) => ({ default: m.PartMasterPage }))
);
const UserManagementPage = React.lazy(() =>
  import('./pages/UserManagementPage').then((m) => ({ default: m.UserManagementPage }))
);
const AuditLogPage = React.lazy(() =>
  import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage }))
);
const InspectionSummaryReportPage = React.lazy(() =>
  import('./pages/InspectionSummaryReportPage').then((m) => ({ default: m.InspectionSummaryReportPage }))
);
import { UserRole } from './types';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireUserManagement?: boolean;
}> = ({ children, allowedRoles, requireUserManagement }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="bg">
        <Spinner size="xl" color="brand.500" borderWidth="4px" />
      </Flex>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the user's appropriate home dashboard
    return (
      <Navigate
        to={
          user.role === 'PRODUCTION_ENGINEER'
            ? '/production/dashboard'
            : '/inspector/dashboard'
        }
        replace
      />
    );
  }

  if (requireUserManagement && !user.canManageUsers) {
    return <Navigate to="/production/dashboard" replace />;
  }

  return <>{children}</>;
};

// Home Redirect Component
const HomeRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="bg">
        <Spinner size="xl" color="brand.500" borderWidth="4px" />
      </Flex>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'PRODUCTION_ENGINEER') {
    return <Navigate to="/production/dashboard" replace />;
  }

  return <Navigate to="/inspector/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <React.Suspense
          fallback={
            <Flex minH="100vh" align="center" justify="center" bg="bg">
              <Spinner size="xl" color="brand.500" borderWidth="4px" />
            </Flex>
          }
        >
          <Routes>
            {/* Public Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Root Redirect */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Production Engineer Routes */}
            <Route
              path="/production/dashboard"
              element={
                <ProtectedRoute allowedRoles={['PRODUCTION_ENGINEER']}>
                  <ProductionDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute allowedRoles={['PRODUCTION_ENGINEER']}>
                  <RequestsListPage isInspectorView={false} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/:id"
              element={
                <ProtectedRoute allowedRoles={['PRODUCTION_ENGINEER', 'QUALITY_INSPECTOR']}>
                  <RequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parts"
              element={
                <ProtectedRoute allowedRoles={['PRODUCTION_ENGINEER']}>
                  <PartMasterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bulk-upload"
              element={<Navigate to="/parts?tab=upload" replace />}
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['PRODUCTION_ENGINEER']} requireUserManagement>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['PRODUCTION_ENGINEER']}>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/summary"
              element={
                <ProtectedRoute allowedRoles={['PRODUCTION_ENGINEER', 'QUALITY_INSPECTOR']}>
                  <InspectionSummaryReportPage />
                </ProtectedRoute>
              }
            />

            {/* Quality Inspector Routes */}
            <Route
              path="/inspector/dashboard"
              element={
                <ProtectedRoute allowedRoles={['QUALITY_INSPECTOR']}>
                  <InspectorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute allowedRoles={['QUALITY_INSPECTOR']}>
                  <RequestsListPage isInspectorView={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/:id/inspect"
              element={
                <ProtectedRoute allowedRoles={['QUALITY_INSPECTOR', 'PRODUCTION_ENGINEER']}>
                  <ReportEntryPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </AuthProvider>
    </Router>
  );
};

export default App;
