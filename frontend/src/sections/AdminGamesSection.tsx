import { Autocomplete, Button, Grid, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { GameDto } from "../types";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";
import { GameCard } from "../components/GameCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function AdminGamesSection() {
  const [games, setGames] = useState<GameDto[]>([]);
  const [deleteId, setDeleteId] = useState("");
  const [updateId, setUpdateId] = useState("");
  const resolveGameId = (value: string) => {
    const match = games.find((game) => game.title.toLowerCase() === value.toLowerCase());
    return match?.id ?? "";
  };
  const [createGameForm, setCreateGameForm] = useState({
    title: "",
    slug: "",
    description: "",
    developer: "",
    publisher: "",
    releaseDate: "",
    imageUrl: "",
    tags: ""
  });
  const [created, setCreated] = useState<GameDto | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [lastAction, setLastAction] = useState<"create" | "delete" | "update" | null>(null);
  const [updateGameForm, setUpdateGameForm] = useState({
    title: "",
    slug: "",
    description: "",
    developer: "",
    publisher: "",
    releaseDate: "",
    imageUrl: "",
    tags: ""
  });

  useEffect(() => {
    const loadGames = async () => {
      const result = await apiFetch<GameDto[]>("/api/games?q=&skip=0&take=200");
      if (result.ok && result.data) {
        setGames(result.data as GameDto[]);
      }
    };
    void loadGames();
  }, [response?.ok]);

  const createGame = async () => {
    const payload = {
      ...createGameForm,
      tags: createGameForm.tags
        ? createGameForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : undefined,
      releaseDate: createGameForm.releaseDate || null
    };
    const result = await apiFetch<GameDto>("/api/games", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setLastAction("create");
    setResponse(result);
    if (result.ok && result.data) {
      setCreated(result.data as GameDto);
    }
  };

  const deleteGame = async () => {
    if (!deleteId) return;
    const resolvedId = resolveGameId(deleteId.trim());
    if (!resolvedId || !/^[0-9a-f-]{36}$/i.test(resolvedId)) {
      setResponse({ ok: false, status: 400, error: "Select a game from the list." });
      return;
    }
    const result = await apiFetch(`/api/games/${resolvedId}`, { method: "DELETE" });
    setLastAction("delete");
    setResponse(result);
    if (result.ok) {
      setGames((prev) => prev.filter((game) => game.id !== resolvedId));
      setDeleteId("");
    }
  };

  const updateGame = async () => {
    if (!updateId) return;
    const resolvedId = resolveGameId(updateId.trim());
    if (!resolvedId || !/^[0-9a-f-]{36}$/i.test(resolvedId)) {
      setResponse({ ok: false, status: 400, error: "Select a game from the list." });
      return;
    }
    const payload: Record<string, unknown> = {};
    if (updateGameForm.title.trim()) payload.title = updateGameForm.title.trim();
    if (updateGameForm.slug.trim()) payload.slug = updateGameForm.slug.trim();
    if (updateGameForm.description.trim()) payload.description = updateGameForm.description.trim();
    if (updateGameForm.developer.trim()) payload.developer = updateGameForm.developer.trim();
    if (updateGameForm.publisher.trim()) payload.publisher = updateGameForm.publisher.trim();
    if (updateGameForm.releaseDate.trim()) payload.releaseDate = updateGameForm.releaseDate.trim();
    if (updateGameForm.imageUrl.trim()) payload.imageUrl = updateGameForm.imageUrl.trim();
    if (updateGameForm.tags.trim()) {
      payload.tags = updateGameForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    const result = await apiFetch<GameDto>(`/api/games/${resolvedId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    setLastAction("update");
    setResponse(result);
    if (result.ok && result.data) {
      const updated = result.data as GameDto;
      setGames((prev) => prev.map((game) => (game.id === updated.id ? updated : game)));
      setUpdateId("");
      setUpdateGameForm({
        title: "",
        slug: "",
        description: "",
        developer: "",
        publisher: "",
        releaseDate: "",
        imageUrl: "",
        tags: ""
      });
    }
  };

  return (
    <SectionCard title="Admin games" subtitle="Create game records for the catalog.">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Title"
            value={createGameForm.title}
            onChange={(e) => setCreateGameForm((prev) => ({ ...prev, title: e.target.value }))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Slug"
            value={createGameForm.slug}
            onChange={(e) => setCreateGameForm((prev) => ({ ...prev, slug: e.target.value }))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={createGameForm.description}
            onChange={(e) => setCreateGameForm((prev) => ({ ...prev, description: e.target.value }))}
            fullWidth
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Developer"
            value={createGameForm.developer}
            onChange={(e) => setCreateGameForm((prev) => ({ ...prev, developer: e.target.value }))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Publisher"
            value={createGameForm.publisher}
            onChange={(e) => setCreateGameForm((prev) => ({ ...prev, publisher: e.target.value }))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Release date (YYYY-MM-DD)"
            value={createGameForm.releaseDate}
            onChange={(e) => setCreateGameForm((prev) => ({ ...prev, releaseDate: e.target.value }))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Image URL"
            value={createGameForm.imageUrl}
            onChange={(e) => setCreateGameForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Tags (comma)"
            value={createGameForm.tags}
            onChange={(e) => setCreateGameForm((prev) => ({ ...prev, tags: e.target.value }))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={createGame}>
            Create game
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Update game</Typography>
          <Stack spacing={1.5} mt={1}>
            <Autocomplete
              freeSolo
              options={games.map((game) => ({ label: game.title, value: game.id }))}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={updateId}
              onInputChange={(_, value) => setUpdateId(value)}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setUpdateId(value);
                } else {
                  setUpdateId(value.value);
                }
              }}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <li key={key} {...optionProps}>
                    <Stack>
                      <Typography>{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.value}
                      </Typography>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => <TextField {...params} label="Game to update" />}
            />
            <TextField
              label="Title"
              value={updateGameForm.title}
              onChange={(e) => setUpdateGameForm((prev) => ({ ...prev, title: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Slug"
              value={updateGameForm.slug}
              onChange={(e) => setUpdateGameForm((prev) => ({ ...prev, slug: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={updateGameForm.description}
              onChange={(e) => setUpdateGameForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Developer"
              value={updateGameForm.developer}
              onChange={(e) => setUpdateGameForm((prev) => ({ ...prev, developer: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Publisher"
              value={updateGameForm.publisher}
              onChange={(e) => setUpdateGameForm((prev) => ({ ...prev, publisher: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Release date (YYYY-MM-DD)"
              value={updateGameForm.releaseDate}
              onChange={(e) => setUpdateGameForm((prev) => ({ ...prev, releaseDate: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Tags (comma)"
              value={updateGameForm.tags}
              onChange={(e) => setUpdateGameForm((prev) => ({ ...prev, tags: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Image URL"
              value={updateGameForm.imageUrl}
              onChange={(e) => setUpdateGameForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              fullWidth
            />
            <Button variant="contained" onClick={updateGame}>
              Update game
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Delete game</Typography>
          <Stack spacing={1.5} mt={1}>
            <Autocomplete
              freeSolo
              options={games.map((game) => ({ label: game.title, value: game.id }))}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={deleteId}
              onInputChange={(_, value) => setDeleteId(value)}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setDeleteId(value);
                } else {
                  setDeleteId(value.value);
                }
              }}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <li key={key} {...optionProps}>
                    <Stack>
                      <Typography>{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.value}
                      </Typography>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => <TextField {...params} label="Game to delete" />}
            />
            <Button color="secondary" variant="contained" onClick={deleteGame}>
              Delete game
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {created && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Created game
          </Typography>
          <GameCard game={created} detailed />
        </>
      )}

      {response?.error && <Notice severity="error" message={response.error} />}
      {response?.ok && lastAction === "create" && <Notice severity="success" message="Game created." />}
      {response?.ok && lastAction === "delete" && <Notice severity="success" message="Game deleted." />}
      {response?.ok && lastAction === "update" && <Notice severity="success" message="Game updated." />}
    </SectionCard>
  );
}
