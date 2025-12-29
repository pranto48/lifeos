import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
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
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
            <Route path="/habits" element={<AppLayout><Habits /></AppLayout>} />
            <Route path="/family" element={<AppLayout><Family /></AppLayout>} />
            <Route path="/budget" element={<AppLayout><Budget /></AppLayout>} />
            <Route path="/salary" element={<AppLayout><Salary /></AppLayout>} />
            <Route path="/investments" element={<AppLayout><Investments /></AppLayout>} />
            <Route path="/goals" element={<AppLayout><Goals /></AppLayout>} />
            <Route path="/projects" element={<AppLayout><Projects /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
