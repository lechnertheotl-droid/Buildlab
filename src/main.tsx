import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { requestPersistentStorage } from './db/db';
import './index.css';

void requestPersistentStorage();

const root = document.getElementById('root');
if (!root) throw new Error('#root nicht gefunden');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
