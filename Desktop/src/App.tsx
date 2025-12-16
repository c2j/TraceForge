import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TFLayout } from './components/TFLayout';
import ForgeDashboard from './pages/ForgeDashboard';
import ForgeRecorder from './pages/ForgeRecorder';
import ForgeEditor from './pages/ForgeEditor';
import ForgeResults from './pages/ForgeResults';
import ForgeNodes from './pages/ForgeNodes';
import ForgeKernels from './pages/ForgeKernels';
import ForgeSettings from './pages/ForgeSettings';
import ForgeScenarios from './pages/ForgeScenarios';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TFLayout />}>
          <Route index element={<ForgeDashboard />} />
          <Route path="scenarios" element={<ForgeScenarios />} />
          <Route path="recorder" element={<ForgeRecorder />} />
          <Route path="editor" element={<ForgeEditor />} />
          <Route path="results" element={<ForgeResults />} />
          <Route path="nodes" element={<ForgeNodes />} />
          <Route path="kernels" element={<ForgeKernels />} />
          <Route path="settings" element={<ForgeSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;