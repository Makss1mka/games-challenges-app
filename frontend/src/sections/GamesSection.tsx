import { Search } from "@mui/icons-material";
import { Button, Grid, Pagination, Stack, TextField, Typography, Chip } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type { ChallengeListResponse, GameDto, TagDto } from "../types";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";
import { GameCard } from "../components/GameCard";
import { useNavigate } from "react-router-dom";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function GamesSection() {
  const navigate = useNavigate();
  const [gamesQuery, setGamesQuery] = useState({ q: "", tags: "", take: 12 });
  const [games, setGames] = useState<GameDto[]>([]);
  const [challengeCounts, setChallengeCounts] = useState<Record<string, number>>({});
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [tagsPage, setTagsPage] = useState(1);
  const tagsPageSize = 12;

  const updateResponse = (result: ApiResponse) => setResponse(result);

  const searchGames = async (pageNumber = page) => {
    const tags = gamesQuery.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => `tags=${encodeURIComponent(tag)}`)
      .join("&");
    const skip = (pageNumber - 1) * gamesQuery.take;
    const result = await apiFetch<GameDto[]>(
      `/api/games?q=${encodeURIComponent(gamesQuery.q)}&${tags}&skip=${skip}&take=${gamesQuery.take}`
    );
    updateResponse(result);
    if (result.ok && result.data) {
      const gamesResult = result.data as GameDto[];
      setGames(gamesResult);
      setHasNextPage(gamesResult.length === gamesQuery.take);
      await loadChallengeCounts(gamesResult);
    }
  };

  const loadChallengeCounts = async (items: GameDto[]) => {
    const requests = items.map(async (game) => {
      const params = new URLSearchParams();
      params.set("game_id", game.id);
      params.set("page_size", "1");
      params.set("page_num", "1");
      const result = await apiFetch<ChallengeListResponse>(`/api/challenges/search?${params.toString()}`);
      if (result.ok && result.data) {
        const payload = result.data as ChallengeListResponse;
        const count = payload.data.length === 0 ? 0 : payload.total_pages;
        return [game.id, count] as const;
      }
      return [game.id, 0] as const;
    });
    const results = await Promise.all(requests);
    const next: Record<string, number> = {};
    results.forEach(([id, count]) => {
      next[id] = count;
    });
    setChallengeCounts(next);
  };

  useEffect(() => {
    void searchGames();
  }, []);

  useEffect(() => {
    const loadTags = async () => {
      const result = await apiFetch<TagDto[]>(`/api/games/tags?q=`);
      if (result.ok && result.data) {
        setTags(result.data as TagDto[]);
        setTagsPage(1);
      }
    };
    void loadTags();
  }, []);

  useEffect(() => {
    void searchGames(page);
  }, [page]);

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      const countA = challengeCounts[a.id] ?? 0;
      const countB = challengeCounts[b.id] ?? 0;
      return countB - countA;
    });
  }, [games, challengeCounts]);

  const addTagFilter = (tag: string) => {
    setGamesQuery((prev) => {
      const current = prev.tags
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (!current.some((value) => value.toLowerCase() === tag.toLowerCase())) {
        current.push(tag);
      }
      return { ...prev, tags: current.join(", ") };
    });
  };

  return (
    <SectionCard title="Games" subtitle="Catalog sorted by challenge activity.">
      <Stack spacing={1.5}>
        <TextField
          fullWidth
          label="Search games"
          value={gamesQuery.q}
          onChange={(e) => setGamesQuery((prev) => ({ ...prev, q: e.target.value }))}
        />
        <TextField
          fullWidth
          label="Filter tags (comma)"
          value={gamesQuery.tags}
          onChange={(e) => setGamesQuery((prev) => ({ ...prev, tags: e.target.value }))}
        />
        <Button
          variant="contained"
          onClick={() => {
            setPage(1);
            void searchGames(1);
          }}
          startIcon={<Search />}
        >
          Search games
        </Button>
      </Stack>

      {tags.length > 0 && (
        <Stack spacing={1} mt={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Tags
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1.5 }}>
            {tags
              .slice((tagsPage - 1) * tagsPageSize, tagsPage * tagsPageSize)
              .map((tag) => (
                <Chip key={tag.id} label={tag.name} onClick={() => addTagFilter(tag.name)} />
              ))}
          </Stack>
          <Pagination
            count={Math.max(Math.ceil(tags.length / tagsPageSize), 1)}
            page={tagsPage}
            onChange={(_, value) => setTagsPage(value)}
            color="secondary"
          />
        </Stack>
      )}

      {sortedGames.length > 0 && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {sortedGames.map((game) => (
            <Grid item xs={12} md={6} key={game.id}>
              <Button
                variant="text"
                sx={{ textAlign: "left", width: "100%", p: 0 }}
                onClick={() => navigate(`/games/${game.id}`)}
              >
                <GameCard
                  game={game}
                  detailed
                  count={challengeCounts[game.id] ?? 0}
                  maxTags={5}
                  sx={{ height: 360, width: "100%" }}
                />
              </Button>
            </Grid>
          ))}
        </Grid>
      )}

      <Stack direction="row" spacing={2} alignItems="center" mt={2}>
        <Pagination
          count={hasNextPage ? page + 1 : page}
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
  );
}
