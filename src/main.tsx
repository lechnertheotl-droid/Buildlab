import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { requestPersistentStorage } from './db/db';
// Schriften lokal bündeln statt Google-CDN (Befund B-26: offline-fähig, DSGVO).
// Bricolage mit opsz-Achse (Display nutzt die optischen Größen), Hanken variabel.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './index.css';

void requestPersistentStorage();

const root = document.getElementById('root');
if (!root) throw new Error('#root nicht gefunden');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
