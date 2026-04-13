import { Button, Grid, MenuItem, Pagination, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";
import type { ChallengeListResponse } from "../types";
import { ChallengeCard } from "../components/ChallengeCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function HomeSection() {
  const navigate = useNavigate();
  const [tags, setTags] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("likes_desc");
  const [result, setResult] = useState<ChallengeListResponse | null>(null);
  const [recommendations, setRecommendations] = useState<ChallengeListResponse | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const loadRecommendations = async () => {
    const params = new URLSearchParams();
    params.set("page_size", "12");
    params.set("page_num", "1");
    const result = await apiFetch<ChallengeListResponse>(`/api/challenges/search?${params.toString()}`);
    if (result.ok && result.data) {
      setRecommendations(result.data as ChallengeListResponse);
    }
  };

  const searchByTags = async (pageNumber = page) => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("key_str", query.trim());
    }
    tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => params.append("tags", tag));
    params.set("page_size", String(pageSize));
    params.set("page_num", String(pageNumber));
    const result = await apiFetch<ChallengeListResponse>(`/api/challenges/search?${params.toString()}`);
    setResponse(result);
    if (result.ok && result.data) {
      setResult(result.data as ChallengeListResponse);
    }
  };

  useEffect(() => {
    void searchByTags();
    void loadRecommendations();
  }, []);

  useEffect(() => {
    void searchByTags(page);
  }, [page]);

  const filteredResults = useMemo(() => {
    const data = Array.isArray(result?.data) ? [...result.data] : [];
    switch (sortBy) {
      case "likes_asc":
        return data.sort((a, b) => a.likes_count - b.likes_count);
      case "likes_desc":
        return data.sort((a, b) => b.likes_count - a.likes_count);
      case "comments_asc":
        return data.sort((a, b) => a.comments_count - b.comments_count);
      case "comments_desc":
        return data.sort((a, b) => b.comments_count - a.comments_count);
      default:
        return data;
    }
  }, [result, sortBy]);

  const topChallenges = useMemo(() => {
    const data = Array.isArray(recommendations?.data) ? recommendations?.data : [];
    return [...data]
      .sort((a, b) => {
        const scoreA = a.likes_count - a.dislikes_count;
        const scoreB = b.likes_count - b.dislikes_count;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.comments_count - a.comments_count;
      })
      .slice(0, 6);
  }, [result]);

  return (
    <Stack spacing={3}>
      <SectionCard title="Recommended challenges" subtitle="Top picks based on reactions.">
        {topChallenges.length ? (
          <Grid container spacing={2} mt={1}>
            {topChallenges.map((challenge) => (
              <Grid item xs={12} md={6} key={challenge.id}>
                <ChallengeCard
                  challenge={challenge}
                  onClick={() => navigate(`/challenges/${challenge.id}`)}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No recommendations yet.
          </Typography>
        )}
      </SectionCard>

      <SectionCard title="Challenges by tags" subtitle="Search the catalog by tags.">
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          <TextField
            label="Search by game or challenge name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
          />
          <TextField
            label="Tags (comma)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="likes_desc">Most likes</MenuItem>
            <MenuItem value="likes_asc">Least likes</MenuItem>
            <MenuItem value="comments_desc">Most comments</MenuItem>
            <MenuItem value="comments_asc">Least comments</MenuItem>
          </TextField>
          <Button
            variant="contained"
            onClick={() => {
              setPage(1);
              void searchByTags(1);
            }}
          >
            Find challenges
          </Button>
        </Stack>

        {filteredResults.length ? (
          <Grid container spacing={2} mt={1}>
            {filteredResults.map((challenge) => (
              <Grid item xs={12} md={6} key={challenge.id}>
                <ChallengeCard
                  challenge={challenge}
                  onClick={() => navigate(`/challenges/${challenge.id}`)}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary" mt={2}>
            No challenges found for the selected tags.
          </Typography>
        )}

        <Stack direction="row" spacing={2} alignItems="center" mt={2}>
          <Pagination
            count={Math.max(result?.total_pages ?? 1, 1)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="secondary"
          />
          <Typography variant="caption" color="text.secondary">
            Page {page}
          </Typography>
        </Stack>

        {response?.error && <Notice severity="error" message={response.error} />}
      </SectionCard>
    </Stack>
  );
}
