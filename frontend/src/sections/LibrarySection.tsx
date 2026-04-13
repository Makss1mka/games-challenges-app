import { Button, Divider, Grid, IconButton, MenuItem, Pagination, Paper, Stack, TextField, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { ImportResult, LibraryItemDto } from "../types";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";
import { useNavigate } from "react-router-dom";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

const libraryStatuses = [
  { label: "Backlog", value: 0 },
  { label: "Playing", value: 1 },
  { label: "Completed", value: 2 },
  { label: "Dropped", value: 3 },
  { label: "Wishlist", value: 4 }
];

export function LibrarySection() {
  const navigate = useNavigate();
  const [libraryItems, setLibraryItems] = useState<LibraryItemDto[]>([]);
  const [libraryQuery, setLibraryQuery] = useState({ q: "", take: 10 });
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [steamImport, setSteamImport] = useState({
    profileId: "",
    includePlayedFreeGames: true,
    importedGamesStatus: 0
  });
  const [epicImport, setEpicImport] = useState({ accountId: "", importedGamesStatus: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [debugPayload, setDebugPayload] = useState<unknown>(null);

  const updateResponse = (result: ApiResponse) => {
    setResponse(result);
    if (!result.ok) {
      setDebugPayload(result.data ?? result.error);
    }
  };

  const sourceLabel = (value: string | number) => {
    const map = ["Manual", "Steam", "EpicGames", "Gog", "Other"];
    const index = Number(value);
    return Number.isFinite(index) ? map[index] ?? String(value) : String(value);
  };

  const statusLabel = (value: string | number) => {
    const map = ["Backlog", "Playing", "Completed", "Dropped", "Wishlist"];
    const index = Number(value);
    return Number.isFinite(index) ? map[index] ?? String(value) : String(value);
  };

  const fetchLibrary = async (pageNumber = page) => {
    const skip = (pageNumber - 1) * libraryQuery.take;
    const result = await apiFetch<LibraryItemDto[]>(
      `/api/library/me?q=${encodeURIComponent(libraryQuery.q)}&skip=${skip}&take=${libraryQuery.take}`
    );
    updateResponse(result);
    if (result.ok && result.data) {
      const items = result.data as LibraryItemDto[];
      setLibraryItems(items);
      setHasNextPage(items.length === libraryQuery.take);
    }
  };

  useEffect(() => {
    void fetchLibrary();
  }, []);

  useEffect(() => {
    void fetchLibrary(page);
  }, [page]);

  const importSteam = async () => {
    if (!steamImport.profileId.trim()) {
      setResponse({ ok: false, status: 400, error: "ProfileId is required." });
      return;
    }
    const result = await apiFetch<ImportResult>("/api/library/me/import/steam", {
      method: "POST",
      body: JSON.stringify({
        profileId: steamImport.profileId,
        includePlayedFreeGames: steamImport.includePlayedFreeGames,
        importedGamesStatus: Number(steamImport.importedGamesStatus)
      })
    });
    updateResponse(result);
    if (result.ok && result.data) {
      setImportResult(result.data as ImportResult);
    }
  };

  const importEpic = async () => {
    if (!epicImport.accountId.trim()) {
      setResponse({ ok: false, status: 400, error: "AccountId is required." });
      return;
    }
    const result = await apiFetch<ImportResult>("/api/library/me/import/epic-games", {
      method: "POST",
      body: JSON.stringify({
        accountId: epicImport.accountId,
        importedGamesStatus: Number(epicImport.importedGamesStatus)
      })
    });
    updateResponse(result);
    if (result.ok && result.data) {
      setImportResult(result.data as ImportResult);
    }
  };

  const removeFromLibrary = async (gameId: string) => {
    const result = await apiFetch(`/api/library/me/${gameId}`, { method: "DELETE" });
    updateResponse(result);
    if (result.ok) {
      await fetchLibrary(page);
    }
  };

  return (
    <SectionCard title="My library" subtitle="Imported games and external library sync.">
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          label="Filter"
          value={libraryQuery.q}
          onChange={(e) => setLibraryQuery((prev) => ({ ...prev, q: e.target.value }))}
        />
        <Button
          variant="outlined"
          onClick={() => {
            setPage(1);
            void fetchLibrary(1);
          }}
        >
          Apply filter
        </Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Steam import</Typography>
          <Stack spacing={1.5} mt={1}>
            <TextField
              label="Steam profileId"
              value={steamImport.profileId}
              onChange={(e) => setSteamImport((prev) => ({ ...prev, profileId: e.target.value }))}
            />
            <TextField
              label="Include free games"
              select
              value={steamImport.includePlayedFreeGames ? "true" : "false"}
              onChange={(e) =>
                setSteamImport((prev) => ({ ...prev, includePlayedFreeGames: e.target.value === "true" }))
              }
            >
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </TextField>
            <TextField
              label="Status for imported"
              select
              value={steamImport.importedGamesStatus}
              onChange={(e) => setSteamImport((prev) => ({ ...prev, importedGamesStatus: Number(e.target.value) }))}
            >
              {libraryStatuses.map((status) => (
                <MenuItem key={status.label} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={importSteam}>
              Import from Steam
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Epic Games import</Typography>
          <Stack spacing={1.5} mt={1}>
            <TextField
              label="Epic accountId"
              value={epicImport.accountId}
              onChange={(e) => setEpicImport((prev) => ({ ...prev, accountId: e.target.value }))}
            />
            <TextField
              label="Status for imported"
              select
              value={epicImport.importedGamesStatus}
              onChange={(e) => setEpicImport((prev) => ({ ...prev, importedGamesStatus: Number(e.target.value) }))}
            >
              {libraryStatuses.map((status) => (
                <MenuItem key={status.label} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={importEpic}>
              Import from Epic
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {importResult && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography fontWeight={700}>
            Import {importResult.provider}: +{importResult.addedToLibraryCount} games
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total: {importResult.importedGamesCount}, already in library: {importResult.alreadyInLibraryCount}
          </Typography>
        </Paper>
      )}

      {libraryItems.length > 0 && (
        <Stack spacing={1} mt={2}>
          {libraryItems.map((item) => (
            <Paper key={item.gameId} sx={{ p: 1.5, width: "100%", display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                variant="text"
                sx={{ textAlign: "left", flexGrow: 1, p: 0 }}
                onClick={() => navigate(`/games/${item.gameId}`)}
              >
                <Stack>
                  <Typography fontWeight={600}>{item.gameTitle}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {sourceLabel(item.source)} - {statusLabel(item.status)} - {new Date(item.addedAtUtc).toLocaleString()}
                  </Typography>
                </Stack>
              </Button>
              <IconButton aria-label="Remove from library" onClick={() => removeFromLibrary(item.gameId)}>
                <Close />
              </IconButton>
            </Paper>
          ))}
        </Stack>
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
      {debugPayload ? (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2">Debug</Typography>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(debugPayload, null, 2)}
          </pre>
        </Paper>
      ) : null}
    </SectionCard>
  );
}
