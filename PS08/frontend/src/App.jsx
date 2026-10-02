import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';

// Protected pages
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import DataCollection from './pages/DataCollection';
import { Environmental, Social, Governance } from './pages/CategoryPages';
import BRSR from './pages/BRSR';
import Validation from './pages/Validation';
import Documents from './pages/Documents';
import Approvals from './pages/Approvals';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />

          {/* Protected — all within AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/data-collection" element={<DataCollection />} />
            <Route path="/environmental" element={<Environmental />} />
            <Route path="/social" element={<Social />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/brsr" element={<BRSR />} />
            <Route path="/validation" element={<Validation />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute requiredPermission="audit-logs">
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
