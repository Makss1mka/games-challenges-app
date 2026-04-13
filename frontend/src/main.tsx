import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { getAccessToken } from "./api/client";
import "./styles.css";

const token = getAccessToken();
const isAuthRoute = window.location.pathname.startsWith("/auth");
if (!token && !isAuthRoute) {
  window.location.replace("/auth");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
