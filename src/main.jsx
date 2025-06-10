import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import SharePage from "./SharePage.jsx";
import Login from "./Login.jsx";
import ShareARPage from "./ShareARPage.jsx";
import { TransformRecallProvider } from "./TransformRecallContext";

// Helper: fallback demo project name for default route
const DEMO_PROJECT = "demo"; // Change to your actual demo projectName if needed

const Main = () => {
  const [authenticated, setAuthenticated] = useState(false);

  return (
    <TransformRecallProvider>
      <Router>
        <Routes>
          {/* ✅ Login Page */}
          <Route path="/login" element={<Login setAuthenticated={setAuthenticated} />} />

          {/* ✅ Protected Route - Redirects to Login if not authenticated */}
          <Route path="/app" element={authenticated ? <App /> : <Navigate to="/login" />} />

          {/* ✅ Share Page - Does not require login */}
          <Route path="/share/:projectName" element={<SharePage />} />

          {/* ✅ Share AR Page - Does not require login */}
          <Route path="/share-ar/:projectName" element={<ShareARPage />} />

          {/* ✅ Embedded Route - Does not require login, for iframe links */}
          <Route path="/embedded/:projectName" element={<ShareARPage />} />

          {/* Welcome Page - Default route for the root URL */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Default Route - Show 404 or Not Found for unmatched routes */}
          <Route path="*" element={<div style={{textAlign:'center',marginTop:80,fontSize:32,fontWeight:700}}>404 - Page Not Found</div>} />
        </Routes>
      </Router>
    </TransformRecallProvider>
  );
};

// Render the app
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Main />
  </StrictMode>
);