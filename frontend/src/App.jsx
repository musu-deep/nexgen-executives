import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AccessProvider, useAccess } from "./contexts/AccessContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import LoginPage from "./pages/LoginPage";
import ActivateAccountPage from "./pages/ActivateAccountPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import TasksPage from "./pages/TasksPage";
import ReportsPage from "./pages/ReportsPage";
import TeamPage from "./pages/TeamPage";
import AdminPage from "./pages/AdminPage";
import AccessControlPage from "./pages/AccessControlPage";
import MeetingsPage from "./pages/MeetingsPage";
import MeetingRequestsPage from "./pages/MeetingRequestsPage";
import DocumentsPage from "./pages/DocumentsPage";
import CalendarPage from "./pages/CalendarPage";
import VoiceInputPage from "./pages/VoiceInputPage";
import MessagesPage from "./pages/MessagesPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import DailyReportPage from "./pages/DailyReportPage";
import AgentLoungePage from "./pages/AgentLoungePage";
import AppLayout from "./components/AppLayout";
import "./App.css";

function LoadingScreen() {
  return <div className="min-h-screen flex items-center justify-center text-slate-400"><div className="text-center"><div className="w-10 h-10 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-3" />Verifying secure session...</div></div>;
}

function ProtectedRoute({ children, permission }) {
  const { user, loading: authLoading } = useAuth();
  const { loading: accessLoading, can } = useAccess();
  if (authLoading || (user && accessLoading)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !can(permission)) return <Navigate to={can("access.manage") ? "/access-control" : "/"} replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { can } = useAccess();
  if (can("dashboard.view")) return <Navigate to="/dashboard" replace />;
  if (can("access.manage")) return <Navigate to="/access-control" replace />;
  if (can("project.view")) return <Navigate to="/projects" replace />;
  return <Navigate to="/settings" replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/activate" element={<ActivateAccountPage />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard" element={<ProtectedRoute permission="dashboard.view"><DashboardPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute permission="project.view"><ProjectsPage /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute permission="project.view"><ProjectDetailPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute permission="task.view"><TasksPage /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute permission="meeting.view"><MeetingsPage /></ProtectedRoute>} />
          <Route path="/meeting-requests" element={<ProtectedRoute permission="meeting.view"><MeetingRequestsPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute permission="meeting.view"><CalendarPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute permission="document.view"><DocumentsPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute permission="message.view"><MessagesPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/voice" element={<ProtectedRoute permission="voice.use"><VoiceInputPage /></ProtectedRoute>} />
          <Route path="/daily-report" element={<ProtectedRoute permission="report.view"><DailyReportPage /></ProtectedRoute>} />
          <Route path="/ai-lounge" element={<ProtectedRoute permission="ai.use"><AgentLoungePage /></ProtectedRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/reports" element={<ProtectedRoute permission="report.view"><ReportsPage /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute permission="user.view"><TeamPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute permission="user.view"><AdminPage /></ProtectedRoute>} />
          <Route path="/access-control" element={<ProtectedRoute permission="access.manage"><AccessControlPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AccessProvider>
              <AppRoutes />
              <Toaster position="top-center" theme="dark" richColors closeButton />
            </AccessProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
