import { Button, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { apiFetch } from "../api/client";
import type { TagDto } from "../types";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function AdminTagsSection() {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<TagDto[]>([]);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const loadTags = async () => {
    const result = await apiFetch<TagDto[]>(`/api/games/tags?q=${encodeURIComponent(query)}`);
    setResponse(result);
    if (result.ok && result.data) {
      setTags(result.data as TagDto[]);
    }
  };

  return (
    <SectionCard title="Admin tags" subtitle="View tags available in the games catalog.">
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField label="Search tags" value={query} onChange={(e) => setQuery(e.target.value)} fullWidth />
        <Button variant="contained" onClick={loadTags}>
          Load tags
        </Button>
      </Stack>
      {tags.length ? (
        <Typography variant="body2" sx={{ mt: 2 }}>
          {tags.map((tag) => tag.name).join(", ")}
        </Typography>
      ) : null}
      {response?.error && <Notice severity="error" message={response.error} />}
    </SectionCard>
  );
}
