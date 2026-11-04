import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../features/auth/auth-context';
import { LoginPage } from '../features/auth/LoginPage';
import { CampaignLayout } from '../features/campaigns/CampaignLayout';
import { CampaignsPage } from '../features/campaigns/CampaignsPage';
import { CampaignTablePage } from '../features/campaigns/CampaignTablePage';
import { CharacterFormPage } from '../features/characters/CharacterFormPage';
import { NoteFormPage } from '../features/notes/NoteFormPage';
import { PaperFilters } from '../theme/HandRing';
import { AppShell } from './AppShell';

export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

function Protected() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/campaigns" replace /> : <LoginPage />} />
      <Route element={<Protected />}>
        <Route
          path="/campaigns"
          element={
            <AppShell>
              <CampaignsPage />
            </AppShell>
          }
        />
        <Route path="/campaigns/:campaignId" element={<CampaignLayout />}>
          <Route index element={<CampaignTablePage />} />
          <Route path="characters/new" element={<CharacterFormPage key="new" />} />
          <Route path="characters/:characterId" element={<CharacterFormPage key="edit" />} />
          <Route path="notes/new" element={<NoteFormPage key="new" />} />
          <Route path="notes/:noteId" element={<NoteFormPage key="edit" />} />
          <Route path="dice" element={<Navigate to={{ pathname: '..', hash: '#dice' }} relative="path" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/campaigns' : '/login'} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={ROUTER_FUTURE}>
        <PaperFilters />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
