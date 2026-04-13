import { Button, Grid, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import { useState } from "react";
import { apiFetch } from "../api/client";
import { ResponsePanel } from "../components/ResponsePanel";
import { SectionCard } from "../components/SectionCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function ConsoleSection() {
  const [rawRequest, setRawRequest] = useState({
    method: "GET",
    path: "/api/games",
    body: ""
  });
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const runRawRequest = async () => {
    const options: RequestInit = { method: rawRequest.method };
    if (rawRequest.body && rawRequest.method !== "GET") {
      options.body = rawRequest.body;
      options.headers = { "Content-Type": "application/json" };
    }
    const result = await apiFetch(rawRequest.path, options);
    setResponse(result);
  };

  return (
    <SectionCard title="API console" subtitle="Direct access to gateway routes.">
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            label="Method"
            select
            value={rawRequest.method}
            onChange={(e) => setRawRequest((prev) => ({ ...prev, method: e.target.value }))}
            fullWidth
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
              <MenuItem key={method} value={method}>
                {method}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={9}>
          <TextField
            label="Path"
            value={rawRequest.path}
            onChange={(e) => setRawRequest((prev) => ({ ...prev, path: e.target.value }))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Body (JSON)"
            value={rawRequest.body}
            onChange={(e) => setRawRequest((prev) => ({ ...prev, body: e.target.value }))}
            multiline
            minRows={4}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={runRawRequest}>
              Send
            </Button>
            {response?.data && (
              <Tooltip title="Copy response">
                <IconButton onClick={() => navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))}>
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Grid>
      </Grid>

      {response && (
        <ResponsePanel
          title={`Result: ${response.ok ? "OK" : "Error"} - ${response.status}`}
          payload={response.data ?? response.error}
        />
      )}
    </SectionCard>
  );
}
