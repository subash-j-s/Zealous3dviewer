import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Container, CircularProgress } from "@mui/material";

const Login = ({ setAuthenticated }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Dummy authentication logic
    setTimeout(() => {
      if (email === "Admin" && password === "Z@123") {
        setAuthenticated(true);
        navigate("/app"); // Redirect to the main app page
      } else {
        setError("Invalid email or password.");
        setLoading(false);
      }
    }, 1500);
  };

  return  (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f5f5",
      }}
    >
      <Box
        sx={{
          width: 400,
          p: 5,
          boxShadow: 3,
          borderRadius: 3,
          textAlign: "center",
          bgcolor: "background.paper",
        }}
      >
        {/* Logo */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <img
            src="/Zealous Logo.svg"
            alt="Logo"
            style={{ maxWidth: "100%", height: "50px" }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: "bold", fontFamily: "Inter, sans-serif" }}
        >
          {/* Login to Zspace App */}
        </Typography>

        {/* Error Message */}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 1, fontWeight: "bold", borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : "Sign In"}
          </Button>
        </form>
      </Box>
    </Box>
  );
};

export default Login;
