import { createBrowserRouter } from "react-router-dom";
import AppShell from "./shell/AppShell";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import GamesPage from "./pages/GamesPage";
import AdminPage from "./pages/AdminPage";
import ChallengeDetailsPage from "./pages/ChallengeDetailsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "auth", element: <AuthPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "games", element: <GamesPage /> },
      { path: "games/:id", element: <GamesPage /> },
      { path: "challenges/:id", element: <ChallengeDetailsPage /> },
      { path: "admin", element: <AdminPage /> }
    ]
  }
]);
