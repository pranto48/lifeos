import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "@/components/settings/ThemeSettings";
import { installSelfHostedFetchInterceptor } from "@/lib/selfHostedConfig";

// Apply saved theme before render to prevent flash
initializeTheme();

// In Docker/self-hosted mode, inject the JWT token into all Supabase client
// requests so the backend can identify the user for CRUD operations.
installSelfHostedFetchInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
