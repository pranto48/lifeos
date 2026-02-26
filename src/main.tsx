import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "@/components/settings/ThemeSettings";

// Apply saved theme before render to prevent flash
initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
