import { Box, Button, Card, CardContent, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { apiFetch, setTokens } from "../api/client";
import type { AuthResponse } from "../types";
import { Notice } from "../components/Notice";
import { useNavigate } from "react-router-dom";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    role: 0
  });
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const updateResponse = (result: ApiResponse) => setResponse(result);

  const handleRegister = async () => {
    const result = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(registerForm)
    });
    updateResponse(result);
    if (result.ok && result.data) {
      setTab(0);
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
      navigate("/profile");
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
      <Card className="glass-card" sx={{ width: 380 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {tab === 0 ? "Login" : "Register"}
          </Typography>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          {tab === 0 && (
            <Stack spacing={2}>
              <TextField
                label="Email"
                value={loginForm.login}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, login: e.target.value }))}
              />
              <TextField
                label="Password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <Button variant="contained" onClick={handleLogin}>
                Sign in
              </Button>
              <Button variant="text" onClick={() => setTab(1)}>
                First time here? Register
              </Button>
              <Button variant="text">Forgot password?</Button>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2}>
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
                label="Role (0=User,1=Moderator,2=Admin)"
                value={registerForm.role}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, role: Number(e.target.value) }))}
              />
              <Button variant="contained" onClick={handleRegister}>
                Create account
              </Button>
              <Button variant="text" onClick={() => setTab(0)}>
                Already have an account? Sign in
              </Button>
            </Stack>
          )}

          {response?.error && <Notice severity="error" message={response.error} />}
          {response?.ok && <Notice severity="success" message="Auth updated." />}
        </CardContent>
      </Card>
    </Box>
  );
}
