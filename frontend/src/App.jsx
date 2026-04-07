import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FoldersPage from './pages/FoldersPage';
import FolderPage from './pages/FolderPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectPage from './pages/ProjectPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import CreateEditTaskPage from './pages/CreateEditTaskPage';
import BalancePage from './pages/BalancePage';
import PrizesPage from './pages/PrizesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import InvitePage from './pages/InvitePage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route element={<AppLayout />}>
          <Route path="/"               element={<DashboardPage />} />
          <Route path="/folders"        element={<FoldersPage />} />
          <Route path="/folders/:id"    element={<FolderPage />} />
          <Route path="/projects"       element={<ProjectsPage />} />
          <Route path="/projects/:id"   element={<ProjectPage />} />
          <Route path="/tasks"          element={<TasksPage />} />
          <Route path="/tasks/new"      element={<CreateEditTaskPage />} />
          <Route path="/tasks/:id"      element={<TaskDetailPage />} />
          <Route path="/tasks/:id/edit" element={<CreateEditTaskPage />} />
          <Route path="/balance"        element={<BalancePage />} />
          <Route path="/prizes"         element={<PrizesPage />} />
          <Route path="/leaderboard"    element={<LeaderboardPage />} />
          <Route path="/admin"          element={<AdminPage />} />
          <Route path="/notifications"  element={<NotificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
