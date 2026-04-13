import { AppBar, Box, Button, Container, CssBaseline, Stack, Toolbar, ThemeProvider, createTheme, IconButton } from "@mui/material";
import { SportsEsports } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { NavLink, Outlet } from "react-router-dom";
import { getAccessToken } from "../api/client";
import { NoticeProvider } from "../components/NoticeProvider";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#5b5a75" },
    secondary: { main: "#9f8ec1" },
    background: { default: "#1c1b22", paper: "rgba(34, 33, 44, 0.92)" },
    text: { primary: "#e6e4ef", secondary: "#a7a4b8" }
  },
  typography: {
    fontFamily: '"Instrument Sans", "Segoe UI", system-ui, sans-serif',
    h3: { fontFamily: '"Space Grotesk", "Segoe UI", system-ui, sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Space Grotesk", "Segoe UI", system-ui, sans-serif', fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 }
  },
  shape: { borderRadius: 18 }
});

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: "none",
  color: "inherit"
});

export default function AppShell() {
  const token = getAccessToken();
  const isAdmin = (() => {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length < 2) return false;
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      const rawRole =
        payload?.role ??
        payload?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      return String(rawRole).toLowerCase() === "admin";
    } catch {
      return false;
    }
  })();
  const profileLabel = token ? "Profile" : "Sign in";
  const profileLink = token ? "/profile" : "/auth";
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NoticeProvider>
        <AppBar elevation={0} color="transparent" position="sticky">
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton color="secondary" onClick={() => navigate("/")}>
                <SportsEsports />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {[
                { to: "/", label: "Home" },
                { to: "/games", label: "Games" },
                ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : [])
              ].map((item) => (
                <NavLink key={item.to} to={item.to} style={navLinkStyle}>
                  {({ isActive }) => (
                    <Button color={isActive ? "secondary" : "inherit"}>{item.label}</Button>
                  )}
                </NavLink>
              ))}
              <NavLink to={profileLink} style={navLinkStyle}>
                {({ isActive }) => (
                  <Button color={isActive ? "secondary" : "inherit"}>{profileLabel}</Button>
                )}
              </NavLink>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box sx={{ py: 5 }}>
          <Container maxWidth="lg">
            <Stack spacing={3}>
              <Outlet />
            </Stack>
          </Container>
        </Box>
      </NoticeProvider>
    </ThemeProvider>
  );
}
