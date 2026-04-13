import { Autocomplete, Button, Grid, Pagination, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getApiBase } from "../api/client";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";
import type { Challenge, ChallengeListResponse, UserDto } from "../types";
import { ChallengeCard } from "../components/ChallengeCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function ChallengesSection() {
  const navigate = useNavigate();
  const [challengeSearch, setChallengeSearch] = useState({
    keyStr: "",
    tags: "",
    gameId: "",
    pageSize: 10,
    pageNum: 1
  });
  const [challengeId, setChallengeId] = useState("");
  const [challengeFile, setChallengeFile] = useState("");
  const [challengeSearchResult, setChallengeSearchResult] = useState<ChallengeListResponse | null>(null);
  const [challengeDetails, setChallengeDetails] = useState<Challenge | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [gameOptions, setGameOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [challengeOptions, setChallengeOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    gameId: "",
    cardDescription: "",
    cardPictureUrl: "",
    tags: "",
    description: ""
  });
  const [cardPicture, setCardPicture] = useState<File | null>(null);

  const updateResponse = (result: ApiResponse) => setResponse(result);

  useEffect(() => {
    const loadOptions = async () => {
      const gamesResult = await apiFetch<Array<{ id: string; title: string }>>("/api/games?q=&skip=0&take=200");
      if (gamesResult.ok && gamesResult.data) {
        const items = gamesResult.data as Array<{ id: string; title: string }>;
        setGameOptions(items.map((item) => ({ label: item.title, value: item.id })));
      }

      const challengeResult = await apiFetch<ChallengeListResponse>("/api/challenges/search?page_size=50&page_num=1");
      if (challengeResult.ok && challengeResult.data) {
        const items = (challengeResult.data as ChallengeListResponse).data;
        setChallengeOptions(items.map((item) => ({ label: item.name, value: item.id })));
      }
    };

    void loadOptions();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const result = await apiFetch<UserDto>("/api/me");
      if (result.ok && result.data) {
        setCurrentUser(result.data as UserDto);
      }
    };
    void loadUser();
  }, []);

  const searchChallenges = async (pageNumber = challengeSearch.pageNum) => {
    const params = new URLSearchParams();
    if (challengeSearch.keyStr) params.set("key_str", challengeSearch.keyStr);
    if (challengeSearch.tags) {
      challengeSearch.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => params.append("tags", tag));
    }
    if (challengeSearch.gameId) params.set("game_id", challengeSearch.gameId);
    params.set("page_size", String(challengeSearch.pageSize));
    params.set("page_num", String(pageNumber));
    const result = await apiFetch<ChallengeListResponse>(`/api/challenges/search?${params.toString()}`);
    updateResponse(result);
    if (result.ok && result.data) {
      setChallengeSearchResult(result.data as ChallengeListResponse);
    }
  };

  const fetchChallenge = async () => {
    if (!challengeId) return;
    const result = await apiFetch<Challenge>(`/api/challenges/${challengeId}`);
    updateResponse(result);
    if (result.ok && result.data) {
      setChallengeDetails(result.data as Challenge);
    }
  };

  const createChallenge = async () => {
    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    if (!createForm.name.trim()) {
      updateResponse({ ok: false, status: 400, error: "Challenge name is required." });
      return;
    }
    if (!createForm.cardDescription.trim()) {
      updateResponse({ ok: false, status: 400, error: "Card description is required." });
      return;
    }
    if (!cardPicture && !createForm.cardPictureUrl.trim()) {
      updateResponse({ ok: false, status: 400, error: "Card picture file or URL is required." });
      return;
    }
    if (!isUuid(createForm.gameId)) {
      updateResponse({ ok: false, status: 400, error: "Select a game from the list." });
      return;
    }

    const form = new FormData();
    form.append("name", createForm.name.trim());
    form.append("game_id", createForm.gameId);
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
    updateResponse(result);
    if (result.ok) {
      setCreateForm({
        name: "",
        gameId: "",
        cardDescription: "",
        cardPictureUrl: "",
        tags: "",
        description: ""
      });
      setCardPicture(null);
      void searchChallenges(1);
    }
  };

  const openChallengeFile = () => {
    if (!challengeFile) return;
    window.open(`${getApiBase().replace(/\/$/, "")}/api/challenges/file/${challengeFile}`, "_blank");
  };

  return (
    <SectionCard title="Challenges" subtitle="Search, details, and file preview.">
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Typography variant="subtitle1">Search challenges</Typography>
          <Grid container spacing={1} mt={0.5}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Keywords"
                value={challengeSearch.keyStr}
                onChange={(e) => setChallengeSearch((prev) => ({ ...prev, keyStr: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Tags (comma)"
                value={challengeSearch.tags}
                onChange={(e) => setChallengeSearch((prev) => ({ ...prev, tags: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={gameOptions}
                getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
                inputValue={challengeSearch.gameId}
                onInputChange={(_, value) =>
                  setChallengeSearch((prev) => ({ ...prev, gameId: value }))
                }
                onChange={(_, value) => {
                  if (!value) return;
                  if (typeof value === "string") {
                    setChallengeSearch((prev) => ({ ...prev, gameId: value }));
                  } else {
                    setChallengeSearch((prev) => ({ ...prev, gameId: value.value }));
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
                renderInput={(params) => <TextField {...params} label="Game" fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Page size"
                type="number"
                value={challengeSearch.pageSize}
                onChange={(e) =>
                  setChallengeSearch((prev) => ({ ...prev, pageSize: Number(e.target.value) }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={() => {
                  setChallengeSearch((prev) => ({ ...prev, pageNum: 1 }));
                  void searchChallenges(1);
                }}
              >
                Search challenges
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle1">Fetch by ID</Typography>
          <Stack spacing={1.5} mt={1}>
            <Autocomplete
              freeSolo
              options={challengeOptions}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={challengeId}
              onInputChange={(_, value) => setChallengeId(value)}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setChallengeId(value);
                } else {
                  setChallengeId(value.value);
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
              renderInput={(params) => <TextField {...params} label="Challenge" />}
            />
            <Button variant="outlined" onClick={fetchChallenge}>
              Load challenge
            </Button>
            <TextField label="File path" value={challengeFile} onChange={(e) => setChallengeFile(e.target.value)} />
            <Button variant="outlined" onClick={openChallengeFile}>
              Open file
            </Button>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2} mt={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle1">Create challenge</Typography>
          {currentUser ? (
            <Grid container spacing={2} mt={0.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={gameOptions}
                  getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
                  inputValue={createForm.gameId}
                  onInputChange={(_, value) => setCreateForm((prev) => ({ ...prev, gameId: value }))}
                  onChange={(_, value) => {
                    if (!value) return;
                    if (typeof value === "string") {
                      setCreateForm((prev) => ({ ...prev, gameId: value }));
                    } else {
                      setCreateForm((prev) => ({ ...prev, gameId: value.value }));
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
                  renderInput={(params) => <TextField {...params} label="Game" fullWidth />}
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
                  label="Card description"
                  value={createForm.cardDescription}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, cardDescription: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Card picture URL"
                  value={createForm.cardPictureUrl}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, cardPictureUrl: e.target.value }))}
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
                  <input type="file" hidden onChange={(e) => setCardPicture(e.target.files?.[0] ?? null)} />
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" onClick={createChallenge}>
                  Create challenge
                </Button>
              </Grid>
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary" mt={1}>
              Sign in to add challenges.
            </Typography>
          )}
        </Grid>
      </Grid>

      {challengeDetails && (
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} md={6}>
            <ChallengeCard
              challenge={challengeDetails}
              onClick={() => navigate(`/challenges/${challengeDetails.id}`)}
            />
          </Grid>
        </Grid>
      )}

      {challengeSearchResult?.data?.length ? (
        <Grid container spacing={2} mt={1}>
          {challengeSearchResult.data.map((challenge) => (
            <Grid item xs={12} md={6} key={challenge.id}>
              <ChallengeCard
                challenge={challenge}
                onClick={() => navigate(`/challenges/${challenge.id}`)}
              />
            </Grid>
          ))}
        </Grid>
      ) : null}

      <Stack direction="row" spacing={2} alignItems="center" mt={2}>
        <Pagination
          count={Math.max(challengeSearchResult?.total_pages ?? 1, 1)}
          page={challengeSearch.pageNum}
          onChange={(_, value) => {
            setChallengeSearch((prev) => ({ ...prev, pageNum: value }));
            void searchChallenges(value);
          }}
          color="secondary"
        />
        <Typography variant="caption" color="text.secondary">
          Page {challengeSearch.pageNum}
        </Typography>
      </Stack>

      {response?.error && <Notice severity="error" message={response.error} />}
    </SectionCard>
  );
}
