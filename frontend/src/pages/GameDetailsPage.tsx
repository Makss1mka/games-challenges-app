import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Pagination, Stack, TextField, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { apiFetch } from "../api/client";
import type { ChallengeListResponse, GameDto, UserDto, LibraryItemDto } from "../types";
import { GameCard } from "../components/GameCard";
import { ChallengeCard } from "../components/ChallengeCard";
import { Notice } from "../components/Notice";
import { useNavigate } from "react-router-dom";

type GameDetailsPageProps = {
  gameId: string;
};

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export default function GameDetailsPage({ gameId }: GameDetailsPageProps) {
  const navigate = useNavigate();
  const [game, setGame] = useState<GameDto | null>(null);
  const [challenges, setChallenges] = useState<ChallengeListResponse | null>(null);
  const [similarGames, setSimilarGames] = useState<GameDto[]>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    cardDescription: "",
    cardPictureUrl: "",
    tags: "",
    description: ""
  });
  const [cardPicture, setCardPicture] = useState<File | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const pageSize = 12;

  useEffect(() => {
    const load = async () => {
      setPage(1);
      const gameResult = await apiFetch<GameDto>(`/api/games/${gameId}`);
      if (gameResult.ok && gameResult.data) {
        setGame(gameResult.data as GameDto);
      } else {
        setResponse(gameResult);
      }
      await loadChallenges(1);
    };
    void load();
  }, [gameId]);

  useEffect(() => {
    const loadUser = async () => {
      const result = await apiFetch<UserDto>("/api/me");
      if (result.ok && result.data) {
        setCurrentUser(result.data as UserDto);
      }
    };
    void loadUser();
  }, []);

  useEffect(() => {
    const loadLibraryState = async () => {
      if (!currentUser || !game) {
        setIsInLibrary(false);
        return;
      }
      const result = await apiFetch<LibraryItemDto[]>(
        `/api/library/me?q=${encodeURIComponent(game.title)}&skip=0&take=200`
      );
      if (result.ok && result.data) {
        const items = result.data as LibraryItemDto[];
        setIsInLibrary(items.some((item) => item.gameId === game.id));
      }
    };
    void loadLibraryState();
  }, [currentUser, game]);

  useEffect(() => {
    if (!game) {
      setSimilarGames([]);
      return;
    }

    const loadSimilar = async () => {
      if (!game.tags?.length) {
        setSimilarGames([]);
        return;
      }

      const result = await apiFetch<GameDto[]>("/api/games?q=&skip=0&take=200");
      if (!result.ok || !result.data) {
        return;
      }

      const targetTags = new Set(game.tags.map((tag) => tag.toLowerCase()));
      const items = (result.data as GameDto[]).filter((item) => item.id !== game.id);
      const scored = items
        .map((item) => {
          const overlap = item.tags.filter((tag) => targetTags.has(tag.toLowerCase())).length;
          return { item, score: overlap };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

      setSimilarGames(scored.slice(0, 4).map((item) => item.item));
    };

    void loadSimilar();
  }, [game]);

  const loadChallenges = async (pageNumber = page) => {
    const params = new URLSearchParams();
    params.set("game_id", gameId);
    if (tagFilter.trim()) {
      tagFilter
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => params.append("tags", tag));
    }
    params.set("page_size", String(pageSize));
    params.set("page_num", String(pageNumber));
    const result = await apiFetch<ChallengeListResponse>(`/api/challenges/search?${params.toString()}`);
    setResponse(result);
    if (result.ok && result.data) {
      setChallenges(result.data as ChallengeListResponse);
    }
  };

  const title = useMemo(() => game?.title ?? "Game details", [game]);

  const createChallenge = async () => {
    if (!game) return;
    if (!createForm.name.trim()) {
      setResponse({ ok: false, status: 400, error: "Challenge name is required." });
      return;
    }
    if (!createForm.cardDescription.trim()) {
      setResponse({ ok: false, status: 400, error: "Card description is required." });
      return;
    }
    if (!cardPicture && !createForm.cardPictureUrl.trim()) {
      setResponse({ ok: false, status: 400, error: "Card picture file or URL is required." });
      return;
    }

    const form = new FormData();
    form.append("name", createForm.name.trim());
    form.append("game_id", game.id);
    const blocks = [
      {
        type: "text",
        content: createForm.description.trim() || createForm.cardDescription.trim(),
        order: 1
      }
    ];
    form.append("description", JSON.stringify(blocks));
    const tags = createForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    form.append("tags", JSON.stringify(tags));
    form.append("card_description", createForm.cardDescription.trim());
    if (cardPicture) form.append("card_picture", cardPicture);
    if (createForm.cardPictureUrl.trim()) {
      form.append("card_picture_url", createForm.cardPictureUrl.trim());
    }

    const result = await apiFetch("/api/challenges", { method: "POST", body: form });
    setResponse(result);
    if (result.ok) {
      setCreateForm({
        name: "",
        cardDescription: "",
        cardPictureUrl: "",
        tags: "",
        description: ""
      });
      setCardPicture(null);
      setCreateOpen(false);
      setPage(1);
      void loadChallenges(1);
    }
  };

  const addToLibrary = async () => {
    if (!game) return;
    if (!currentUser) {
      navigate("/auth");
      return;
    }

    const result = await apiFetch("/api/library/me", {
      method: "POST",
      body: JSON.stringify({
        gameId: game.id,
        source: 0,
        status: 0
      })
    });
    setResponse(result);
    if (result.ok) {
      setIsInLibrary(true);
    }
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Button
            startIcon={<ArrowBack />}
            variant="text"
            sx={{ mb: 1 }}
            onClick={() => navigate("/games")}
          >
            Back to games
          </Button>
          <Typography variant="h4" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Challenges for this game
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={addToLibrary}
            disabled={isInLibrary}
          >
            {isInLibrary ? "Added to profile" : "Add to profile"}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!currentUser) {
                navigate("/auth");
                return;
              }
              setCreateOpen(true);
            }}
          >
            Create challenge
          </Button>
        </Stack>
      </Box>

      {game && <GameCard game={game} detailed />}

      {game?.tags?.length ? (
        <Stack spacing={1}>
          <Typography variant="h6">Tags</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1.5 }}>
            {game.tags.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </Stack>
        </Stack>
      ) : null}

      {similarGames.length ? (
        <Stack spacing={1}>
          <Typography variant="h6">Similar games</Typography>
          <Grid container spacing={2}>
            {similarGames.map((item) => (
              <Grid item xs={12} md={6} key={item.id}>
                <Button
                  variant="text"
                  sx={{ textAlign: "left", width: "100%", p: 0 }}
                  onClick={() => navigate(`/games/${item.id}`)}
                >
                  <GameCard game={item} detailed sx={{ height: 240, width: "100%" }} />
                </Button>
              </Grid>
            ))}
          </Grid>
        </Stack>
      ) : null}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create challenge for {game?.title}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Name"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Card description"
                value={createForm.cardDescription}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, cardDescription: e.target.value }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Card picture URL"
                value={createForm.cardPictureUrl}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, cardPictureUrl: e.target.value }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Tags (comma)"
                value={createForm.tags}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, tags: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button variant="outlined" component="label" fullWidth>
                Upload card picture
                <input
                  type="file"
                  hidden
                  onChange={(e) => setCardPicture(e.target.files?.[0] ?? null)}
                />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={createChallenge}>
            Create challenge
          </Button>
        </DialogActions>
      </Dialog>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
        <TextField
          label="Filter tags (comma)"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          fullWidth
        />
        <Button
          variant="contained"
          onClick={() => {
            setPage(1);
            void loadChallenges(1);
          }}
        >
          Apply filter
        </Button>
      </Stack>

      {challenges?.data?.length ? (
        <Grid container spacing={2}>
          {challenges.data.map((challenge) => (
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
          No challenges found for this game.
        </Typography>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <Pagination
          count={Math.max(challenges?.total_pages ?? 1, 1)}
          page={page}
          onChange={(_, value) => {
            setPage(value);
            void loadChallenges(value);
          }}
          color="secondary"
        />
        <Typography variant="caption" color="text.secondary">
          Page {page}
        </Typography>
      </Stack>

      {response?.error && <Notice severity="error" message={response.error} />}
    </Stack>
  );
}
