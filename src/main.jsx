import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import SharePage from "./SharePage.jsx";
import Login from "./Login.jsx";
import ShareARPage from "./ShareARPage.jsx"; // Add this import

const Main = () => {
  const [authenticated, setAuthenticated] = useState(false);

  return (
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

        {/* ✅ Default Route - Redirect to Login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

// Render the app
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Main />
  </StrictMode>
);