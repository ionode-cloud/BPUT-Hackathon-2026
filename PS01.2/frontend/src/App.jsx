import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NodeProvider } from './context/NodeContext';
import { AlertProvider } from './context/AlertContext';
import { AlertPopupContainer } from './components/AlertPopup';
import MainLayout from './layouts/MainLayout';
import Overview from './pages/Overview';
import Alerts from './pages/Alerts';
import Nodes from './pages/Nodes';
import SensorDetails from './pages/SensorDetails';
import Analytics from './pages/Analytics';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <NodeProvider>
        <AlertProvider>
          <AlertPopupContainer />
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview"   element={<Overview />} />
              <Route path="alerts"     element={<Alerts />} />
              <Route path="nodes"      element={<Nodes />} />
              <Route path="monitoring" element={<Navigate to="/overview" replace />} />
              <Route path="sensors"    element={<SensorDetails />} />
              <Route path="analytics"  element={<Analytics />} />
              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </AlertProvider>
      </NodeProvider>
    </BrowserRouter>
  );
}

export default App;
