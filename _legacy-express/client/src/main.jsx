import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/jost/index.css';
import './styles/base.css';
import './styles/pages.css';
import './styles/admin.css';
import App from './App.jsx';
import { AuthProvider } from './context.jsx';
import { ToastProvider } from './toast.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
