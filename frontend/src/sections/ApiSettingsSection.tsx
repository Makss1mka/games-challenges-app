import { Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { getApiBase, setApiBase } from "../api/client";
import { SectionCard } from "../components/SectionCard";

export function ApiSettingsSection() {
  const [apiBase, setApiBaseState] = useState(getApiBase());

  return (
    <SectionCard title="Connection settings" subtitle="Update the gateway URL when needed.">
      <Stack spacing={2}>
        <TextField
          label="API base URL"
          value={apiBase}
          onChange={(e) => setApiBaseState(e.target.value)}
          helperText="Example: http://localhost:8080"
          fullWidth
        />
        <Button variant="contained" onClick={() => setApiBase(apiBase)}>
          Save
        </Button>
      </Stack>
    </SectionCard>
  );
}
