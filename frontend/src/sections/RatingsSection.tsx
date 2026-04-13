import { Button, Grid, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type { Challenge, ChallengeListResponse } from "../types";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";
import { ChallengeCard } from "../components/ChallengeCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function RatingsSection() {
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<ChallengeListResponse | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const loadRatings = async () => {
    const params = new URLSearchParams();
    tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => params.append("tags", tag));
    params.set("pageSize", "50");
    params.set("pageNum", "1");
    const result = await apiFetch<ChallengeListResponse>(`/api/challenges/search?${params.toString()}`);
    setResponse(result);
    if (result.ok && result.data) {
      setResult(result.data as ChallengeListResponse);
    }
  };

  const sorted = useMemo(() => {
    const data = result?.data ?? [];
    return [...data].sort((a, b) => {
      const scoreA = a.likes_count - a.dislikes_count;
      const scoreB = b.likes_count - b.dislikes_count;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.comments_count - a.comments_count;
    });
  }, [result]);

  const totalStats = useMemo(() => {
    const data = result?.data ?? [];
    return data.reduce(
      (acc, item) => ({
        likes: acc.likes + item.likes_count,
        dislikes: acc.dislikes + item.dislikes_count,
        comments: acc.comments + item.comments_count
      }),
      { likes: 0, dislikes: 0, comments: 0 }
    );
  }, [result]);

  return (
    <SectionCard title="Ratings" subtitle="Leaderboards and challenge ratings.">
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
        <TextField
          label="Tags (comma)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          fullWidth
        />
        <Button variant="contained" onClick={loadRatings}>
          Load ratings
        </Button>
      </Stack>

      {result && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={2}>
          <Typography variant="body2">
            Total likes: {totalStats.likes}
          </Typography>
          <Typography variant="body2">
            Total dislikes: {totalStats.dislikes}
          </Typography>
          <Typography variant="body2">
            Total comments: {totalStats.comments}
          </Typography>
        </Stack>
      )}

      {sorted.length ? (
        <Grid container spacing={2} mt={1}>
          {sorted.map((challenge: Challenge) => (
            <Grid item xs={12} md={6} key={challenge.id}>
              <ChallengeCard challenge={challenge} />
            </Grid>
          ))}
        </Grid>
      ) : null}

      {response?.error && <Notice severity="error" message={response.error} />}
    </SectionCard>
  );
}
