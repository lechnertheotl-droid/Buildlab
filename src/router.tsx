// src/router.tsx — HashRouter-Routen (SCREENS.md §1).

import { createHashRouter, Navigate } from 'react-router-dom';
import AppShell from './shell/AppShell';
import { RouteError } from './shell/RouteError';
import ProjectTree from './screens/ProjectTree';
import Workspace from './screens/Workspace';
import ConceptPage from './screens/ConceptPage';
import Settings from './screens/Settings';
import NotFound from './screens/NotFound';
import { conceptById, projectById } from './content';

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <ProjectTree />, handle: { crumb: 'Projektkarte' } },
      {
        // Alte Projektdetail-Route: die Projektkarte ist jetzt der Hub.
        path: 'projekt/:id',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'projekt/:id/schritt/:n',
        element: <Workspace />,
        // Breadcrumb „Projekt · Schritt n/m“ rendert der Workspace selbst in
        // seiner Kopfzeile; die Topbar zeigt den Projekttitel.
        handle: { crumb: 'Projekt' },
        loader: ({ params }) => {
          const p = params.id ? projectById.get(params.id) : undefined;
          return p?.title ?? 'Projekt';
        },
      },
      {
        path: 'konzept/:id',
        element: <ConceptPage />,
        loader: ({ params }) => (params.id && conceptById.get(params.id)?.name) || 'Konzept',
        handle: { crumb: 'Konzept' },
      },
      { path: 'einstellungen', element: <Settings />, handle: { crumb: 'Einstellungen' } },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
