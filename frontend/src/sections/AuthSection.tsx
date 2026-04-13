import { Login, Logout, Refresh } from "@mui/icons-material";
import { Button, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { apiFetch, clearTokens, getRefreshToken, setTokens } from "../api/client";
import type { AuthResponse } from "../types";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function AuthSection() {
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    role: 0
  });
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [refreshToken, setRefreshToken] = useState(getRefreshToken() || "");
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const updateResponse = (result: ApiResponse) => setResponse(result);

  const handleRegister = async () => {
    const result = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(registerForm)
    });
    updateResponse(result);
    if (result.ok && result.data) {
      const data = result.data as AuthResponse;
      setTokens(data.accessToken, data.refreshToken);
      setRefreshToken(data.refreshToken);
    }
  };

  const handleLogin = async () => {
    const result = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(loginForm)
    });
    updateResponse(result);
    if (result.ok && result.data) {
      const data = result.data as AuthResponse;
      setTokens(data.accessToken, data.refreshToken);
      setRefreshToken(data.refreshToken);
    }
  };

  const handleRefresh = async () => {
    const result = await apiFetch<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });
    updateResponse(result);
    if (result.ok && result.data) {
      const data = result.data as AuthResponse;
      setTokens(data.accessToken, data.refreshToken);
      setRefreshToken(data.refreshToken);
    }
  };

  const handleLogoutAll = async () => {
    const result = await apiFetch("/api/auth/logout-all", { method: "POST" });
    updateResponse(result);
    if (result.ok) {
      clearTokens();
    }
  };

  return (
    <SectionCard title="Auth" subtitle="Register, login, refresh, logout-all.">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Register</Typography>
          <Stack spacing={1.5} mt={1}>
            <TextField
              label="Username"
              value={registerForm.username}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
            />
            <TextField
              label="Email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              label="Password"
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <TextField
              label="Role"
              select
              value={registerForm.role}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, role: Number(e.target.value) }))}
            >
              <MenuItem value={0}>User</MenuItem>
              <MenuItem value={1}>Moderator</MenuItem>
              <MenuItem value={2}>Admin</MenuItem>
            </TextField>
            <Button variant="contained" onClick={handleRegister} startIcon={<Login />}>
              Register
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Login</Typography>
          <Stack spacing={1.5} mt={1}>
            <TextField
              label="Login (email or username)"
              value={loginForm.login}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, login: e.target.value }))}
            />
            <TextField
              label="Password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <Button variant="outlined" onClick={handleLogin} startIcon={<Login />}>
              Login
            </Button>
            <TextField label="Refresh token" value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={handleRefresh} startIcon={<Refresh />}>
                Refresh
              </Button>
              <Button color="secondary" onClick={handleLogoutAll} startIcon={<Logout />}>
                Logout all
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
      {response?.error && <Notice severity="error" message={response.error} />}
      {response?.ok && <Notice severity="success" message="Auth updated." />}
    </SectionCard>
  );
}
