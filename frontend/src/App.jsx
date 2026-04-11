import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/layout/AppLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FoldersPage = lazy(() => import('./pages/FoldersPage'));
const FolderPage = lazy(() => import('./pages/FolderPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));
const CreateEditTaskPage = lazy(() => import('./pages/CreateEditTaskPage'));
const BalancePage = lazy(() => import('./pages/BalancePage'));
const PrizesPage = lazy(() => import('./pages/PrizesPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

function RouteFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '42vh',
        color: 'var(--text3, #64748b)',
        fontSize: 14,
      }}
    >
      Загрузка…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/folders" element={<FoldersPage />} />
            <Route path="/folders/:id" element={<FolderPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/new" element={<CreateEditTaskPage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/tasks/:id/edit" element={<CreateEditTaskPage />} />
            <Route path="/balance" element={<BalancePage />} />
            <Route path="/prizes" element={<PrizesPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
