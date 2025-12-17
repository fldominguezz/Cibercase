import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/Login';
import Home from './components/Home';
import Tickets from './components/Tickets';
import Register from './components/Register';
import ProtectedLayout from './components/ProtectedLayout';
import SessionWatcher from './components/SessionWatcher';
import CreateTicketPage from './components/CreateTicketPage'; // Import CreateTicketPage
import EMLScanner from './components/EMLScanner'; // Import EMLScanner
import { ModalProvider } from './context/ModalContext'; // Import ModalProvider

// Lazy load components
const Forms = lazy(() => import('./components/Forms'));
const AuditLogViewer = lazy(() => import('./components/AuditLogViewer'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const InstalacionAvForm = lazy(() => import('./components/InstalacionAvForm'));
const RelevamientosForm = lazy(() => import('./components/RelevamientosForm'));
const ExcepcionForm = lazy(() => import('./components/ExcepcionForm'));
const ScanVulnerabilidadesForm = lazy(() => import('./components/ScanVulnerabilidadesForm'));

function App() {
  return (
    <Router>
      <SessionWatcher />
      <ModalProvider> {/* Wrap the entire application with ModalProvider */}
        <Suspense fallback={<div>Cargando...</div>}> {/* Add Suspense for lazy loaded components */}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/tickets/:ticketId" element={<Tickets />} />
              <Route path="/tickets-filtered" element={<Tickets />} /> {/* New route for filtered tickets */}
              <Route path="/create-ticket" element={<CreateTicketPage />} /> {/* New route for creating tickets */}
              <Route path="/register" element={<Register />} />
              <Route path="/auditoria" element={<AuditLogViewer />} />
              <Route path="/forms" element={<Forms />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/instalacion-av" element={<InstalacionAvForm />} />
              <Route path="/relevamientos" element={<RelevamientosForm />} />
              <Route path="/solicitudes-excepcion" element={<ExcepcionForm />} />
              <Route path="/scan-vulnerabilidades" element={<ScanVulnerabilidadesForm />} />
              <Route path="/eml-scanner" element={<EMLScanner />} />
            </Route>
          </Routes>
        </Suspense>
      </ModalProvider>
      <ToastContainer />
    </Router>
  );
}

export default App;

