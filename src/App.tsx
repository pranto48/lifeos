import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DashboardModeProvider } from "@/contexts/DashboardModeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PersonalPageGuard } from "@/components/layout/PersonalPageGuard";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Habits from "./pages/Habits";
import Family from "./pages/Family";
import Budget from "./pages/Budget";
import Salary from "./pages/Salary";
import Investments from "./pages/Investments";
import Goals from "./pages/Goals";
import Projects from "./pages/Projects";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <DashboardModeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
                <Route path="/tasks" element={<AppLayout><Tasks /></AppLayout>} />
                <Route path="/notes" element={<AppLayout><Notes /></AppLayout>} />
                <Route path="/habits" element={<AppLayout><PersonalPageGuard><Habits /></PersonalPageGuard></AppLayout>} />
                <Route path="/family" element={<AppLayout><PersonalPageGuard><Family /></PersonalPageGuard></AppLayout>} />
                <Route path="/budget" element={<AppLayout><PersonalPageGuard><Budget /></PersonalPageGuard></AppLayout>} />
                <Route path="/salary" element={<AppLayout><PersonalPageGuard><Salary /></PersonalPageGuard></AppLayout>} />
                <Route path="/investments" element={<AppLayout><PersonalPageGuard><Investments /></PersonalPageGuard></AppLayout>} />
                <Route path="/goals" element={<AppLayout><Goals /></AppLayout>} />
                <Route path="/projects" element={<AppLayout><Projects /></AppLayout>} />
                <Route path="/calendar" element={<AppLayout><Calendar /></AppLayout>} />
                <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </DashboardModeProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
