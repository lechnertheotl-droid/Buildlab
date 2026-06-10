// src/router.tsx — HashRouter-Routen (SCREENS.md §1).

import { createHashRouter } from 'react-router-dom';
import AppShell from './shell/AppShell';
import { RouteError } from './shell/RouteError';
import Onboarding from './screens/Onboarding';
import Dashboard from './screens/Dashboard';
import SkillMap from './screens/SkillMap';
import ProjectList from './screens/ProjectList';
import ProjectDetail from './screens/ProjectDetail';
import Workspace from './screens/Workspace';
import ConceptPage from './screens/ConceptPage';
import Werkstatt from './screens/Werkstatt';
import Training from './screens/Training';
import Settings from './screens/Settings';
import NotFound from './screens/NotFound';
import { conceptById, projectById } from './content';

export const router = createHashRouter([
  { path: '/onboarding', element: <Onboarding /> },
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard />, handle: { crumb: 'Start' } },
      { path: 'karte', element: <SkillMap />, handle: { crumb: 'Skill-Map' } },
      { path: 'projekte', element: <ProjectList />, handle: { crumb: 'Projekte' } },
      {
        path: 'projekt/:id',
        element: <ProjectDetail />,
        handle: { crumb: 'Projekte' },
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
      { path: 'werkstatt', element: <Werkstatt />, handle: { crumb: 'Werkstatt' } },
      { path: 'training', element: <Training />, handle: { crumb: 'Training' } },
      { path: 'einstellungen', element: <Settings />, handle: { crumb: 'Einstellungen' } },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
