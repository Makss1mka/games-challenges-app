import { Autocomplete, Button, Divider, Grid, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function AdminActionsSection() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [gameOptions, setGameOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [challengeOptions, setChallengeOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [createForm, setCreateForm] = useState({
    name: "",
    gameId: "",
    cardDescription: "",
    cardPictureUrl: "",
    tags: "",
    descriptionJson: ""
  });
  const [cardPicture, setCardPicture] = useState<File | null>(null);
  const [contentImages, setContentImages] = useState<FileList | null>(null);

  const [updateForm, setUpdateForm] = useState({
    challengeId: "",
    name: "",
    gameId: "",
    cardDescription: "",
    tags: ""
  });

  const [deleteId, setDeleteId] = useState("");
  const [cardPictureUpdate, setCardPictureUpdate] = useState<File | null>(null);

  const [blockForm, setBlockForm] = useState({
    challengeId: "",
    blockJson: "{\"type\":\"text\",\"content\":\"\", \"order\": 1}"
  });
  const [blockImage, setBlockImage] = useState<File | null>(null);

  const [updateBlockForm, setUpdateBlockForm] = useState({
    challengeId: "",
    blockId: "",
    blockJson: "{\"type\":\"text\",\"content\":\"\", \"order\": 1}"
  });
  const [updateBlockImage, setUpdateBlockImage] = useState<File | null>(null);

  const [deleteBlock, setDeleteBlock] = useState({ challengeId: "", blockId: "" });
  const [orderForm, setOrderForm] = useState({ challengeId: "", orders: "1,2,3" });

  const updateResponse = (result: ApiResponse) => setResponse(result);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const resolveGameId = (value: string) => {
    if (isUuid(value)) return value;
    const match = gameOptions.find((option) => option.label.toLowerCase() === value.toLowerCase());
    return match?.value ?? value;
  };

  const resolveChallengeId = (value: string) => {
    if (isUuid(value)) return value;
    const match = challengeOptions.find((option) => option.label.toLowerCase() === value.toLowerCase());
    return match?.value ?? value;
  };

  useEffect(() => {
    const loadOptions = async () => {
      const gamesResult = await apiFetch<Array<{ id: string; title: string }>>("/api/games?q=&skip=0&take=200");
      if (gamesResult.ok && gamesResult.data) {
        const items = gamesResult.data as Array<{ id: string; title: string }>;
        setGameOptions(items.map((item) => ({ label: item.title, value: item.id })));
      }

      const challengeResult = await apiFetch<any>("/api/challenges/search?page_size=50&page_num=1");
      if (challengeResult.ok && challengeResult.data) {
        const items = (challengeResult.data as { data: Array<{ id: string; name: string }> }).data;
        if (Array.isArray(items)) {
          setChallengeOptions(items.map((item) => ({ label: item.name, value: item.id })));
        }
      }
    };

    void loadOptions();
  }, []);

  const createChallenge = async () => {
    if (!cardPicture && !createForm.cardPictureUrl.trim()) {
      updateResponse({ ok: false, status: 400, error: "Card picture file or URL is required." });
      return;
    }
    if (!createForm.cardDescription.trim()) {
      updateResponse({ ok: false, status: 400, error: "Card description is required." });
      return;
    }

    let parsedDescription: unknown = [];
    try {
      if (createForm.descriptionJson.trim().length > 0) {
        parsedDescription = JSON.parse(createForm.descriptionJson);
      }
      if (!Array.isArray(parsedDescription)) {
        throw new Error("Description must be an array");
      }
    } catch {
      parsedDescription = [
        {
          type: "text",
          content: createForm.descriptionJson.trim() || createForm.cardDescription,
          order: 1
        }
      ];
    }

    const needsImages = (parsedDescription as any[]).some(
      (block: any) =>
        block?.type?.toString?.() === "picture" &&
        typeof block?.content === "string" &&
        !block.content.startsWith("http")
    );
    if (needsImages && (!contentImages || contentImages.length === 0)) {
      updateResponse({
        ok: false,
        status: 400,
        error: "Picture blocks require content images with matching filenames."
      });
      return;
    }

    const resolvedGameId = resolveGameId(createForm.gameId.trim());
    if (!isUuid(resolvedGameId)) {
      updateResponse({ ok: false, status: 400, error: "Select a game from the list." });
      return;
    }

    const normalizedBlocks = (parsedDescription as any[]).map((block, index) => {
      if (typeof block === "string") {
        return {
          type: "text",
          content: block,
          order: index + 1
        };
      }
      if (!block || typeof block !== "object") {
        return {
          type: "text",
          content: String(block ?? ""),
          order: index + 1
        };
      }
      return { order: index + 1, ...block };
    });

    const form = new FormData();
    form.append("name", createForm.name);
    form.append("game_id", resolvedGameId);
    form.append("description", JSON.stringify(normalizedBlocks));
    const tags = createForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    form.append("tags", JSON.stringify(tags));
    form.append("card_description", createForm.cardDescription);
    if (cardPicture) form.append("card_picture", cardPicture);
    if (createForm.cardPictureUrl.trim()) {
      form.append("card_picture_url", createForm.cardPictureUrl.trim());
    }
    if (contentImages) {
      Array.from(contentImages).forEach((file) => form.append("images", file));
    }
    const result = await apiFetch("/api/challenges", { method: "POST", body: form });
    updateResponse(result);
  };

  const updateChallenge = async () => {
    if (!updateForm.challengeId) return;
    const resolvedGameId = resolveGameId(updateForm.gameId.trim());
    const payload: Record<string, unknown> = {};
    if (updateForm.name) payload.name = updateForm.name;
    if (updateForm.gameId) payload.game_id = isUuid(resolvedGameId) ? resolvedGameId : updateForm.gameId;
    if (updateForm.cardDescription) payload.card_description = updateForm.cardDescription;
    if (updateForm.tags) {
      payload.tags = updateForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    }
    const result = await apiFetch(`/api/challenges/${updateForm.challengeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    updateResponse(result);
  };

  const deleteChallenge = async () => {
    if (!deleteId) return;
    const resolvedId = resolveChallengeId(deleteId.trim());
    if (!isUuid(resolvedId)) {
      updateResponse({ ok: false, status: 400, error: "Select a challenge from the list." });
      return;
    }
    const result = await apiFetch(`/api/challenges/${resolvedId}`, { method: "DELETE" });
    updateResponse(result);
  };

  const uploadCardPicture = async () => {
    if (!updateForm.challengeId || !cardPictureUpdate) return;
    const form = new FormData();
    form.append("picture", cardPictureUpdate);
    const result = await apiFetch(`/api/challenges/${updateForm.challengeId}/set_card_picture`, {
      method: "POST",
      body: form
    });
    updateResponse(result);
  };

  const addBlock = async () => {
    if (!blockForm.challengeId) return;
    const form = new FormData();
    form.append("block", blockForm.blockJson);
    if (blockImage) form.append("image", blockImage);
    const result = await apiFetch(`/api/challenges/${blockForm.challengeId}/blocks`, {
      method: "POST",
      body: form
    });
    updateResponse(result);
  };

  const updateBlock = async () => {
    if (!updateBlockForm.challengeId || !updateBlockForm.blockId) return;
    const form = new FormData();
    form.append("block", updateBlockForm.blockJson);
    if (updateBlockImage) form.append("image", updateBlockImage);
    const result = await apiFetch(
      `/api/challenges/${updateBlockForm.challengeId}/blocks/${updateBlockForm.blockId}`,
      { method: "PATCH", body: form }
    );
    updateResponse(result);
  };

  const deleteBlockRequest = async () => {
    if (!deleteBlock.challengeId || !deleteBlock.blockId) return;
    const result = await apiFetch(`/api/challenges/${deleteBlock.challengeId}/blocks/${deleteBlock.blockId}`, {
      method: "DELETE"
    });
    updateResponse(result);
  };

  const changeOrder = async () => {
    if (!orderForm.challengeId) return;
    const newOrders = orderForm.orders
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));
    const result = await apiFetch(`/api/challenges/${orderForm.challengeId}/blocks/change_order`, {
      method: "PATCH",
      body: JSON.stringify({ new_orders: newOrders })
    });
    updateResponse(result);
  };

  return (
    <SectionCard title="Admin actions" subtitle="High-privilege challenge management workflows.">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Create challenge (multipart)</Typography>
          <Stack spacing={1.5} mt={1}>
            <TextField
              label="Name"
              value={createForm.name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            />
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
              renderInput={(params) => <TextField {...params} label="Game" />}
            />
            <TextField
              label="Card description"
              value={createForm.cardDescription}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, cardDescription: e.target.value }))}
            />
            <TextField
              label="Card picture URL"
              value={createForm.cardPictureUrl}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, cardPictureUrl: e.target.value }))}
            />
            <TextField label="Tags (comma)" value={createForm.tags} onChange={(e) => setCreateForm((prev) => ({ ...prev, tags: e.target.value }))} />
            <TextField
              label="Description"
              value={createForm.descriptionJson}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, descriptionJson: e.target.value }))}
              multiline
              minRows={3}
            />
            <Button variant="outlined" component="label">
              Upload card picture
              <input type="file" hidden onChange={(e) => setCardPicture(e.target.files?.[0] ?? null)} />
            </Button>
            <Button variant="outlined" component="label">
              Upload content images
              <input type="file" multiple hidden onChange={(e) => setContentImages(e.target.files)} />
            </Button>
            <Button variant="contained" onClick={createChallenge}>
              Create challenge
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Update challenge</Typography>
          <Stack spacing={1.5} mt={1}>
            <Autocomplete
              freeSolo
              options={challengeOptions}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={updateForm.challengeId}
              onInputChange={(_, value) => setUpdateForm((prev) => ({ ...prev, challengeId: value }))}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setUpdateForm((prev) => ({ ...prev, challengeId: value }));
                } else {
                  setUpdateForm((prev) => ({ ...prev, challengeId: value.value }));
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
            <TextField label="Name" value={updateForm.name} onChange={(e) => setUpdateForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Autocomplete
              freeSolo
              options={gameOptions}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={updateForm.gameId}
              onInputChange={(_, value) => setUpdateForm((prev) => ({ ...prev, gameId: value }))}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setUpdateForm((prev) => ({ ...prev, gameId: value }));
                } else {
                  setUpdateForm((prev) => ({ ...prev, gameId: value.value }));
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
              renderInput={(params) => <TextField {...params} label="Game" />}
            />
            <TextField label="Card description" value={updateForm.cardDescription} onChange={(e) => setUpdateForm((prev) => ({ ...prev, cardDescription: e.target.value }))} />
            <TextField label="Tags (comma)" value={updateForm.tags} onChange={(e) => setUpdateForm((prev) => ({ ...prev, tags: e.target.value }))} />
            <Button variant="contained" onClick={updateChallenge}>
              Update challenge
            </Button>
            <Divider />
            <Typography variant="subtitle2">Update card picture</Typography>
            <Button variant="outlined" component="label">
              Select picture
              <input type="file" hidden onChange={(e) => setCardPictureUpdate(e.target.files?.[0] ?? null)} />
            </Button>
            <Button variant="outlined" onClick={uploadCardPicture}>
              Upload card picture
            </Button>
            <Divider />
            <Autocomplete
              freeSolo
              options={challengeOptions}
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
              renderInput={(params) => <TextField {...params} label="Challenge to delete" />}
            />
            <Button color="secondary" variant="contained" onClick={deleteChallenge}>
              Delete challenge
            </Button>
          </Stack>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Blocks: add block</Typography>
          <Stack spacing={1.5} mt={1}>
            <Autocomplete
              freeSolo
              options={challengeOptions}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={blockForm.challengeId}
              onInputChange={(_, value) => setBlockForm((prev) => ({ ...prev, challengeId: value }))}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setBlockForm((prev) => ({ ...prev, challengeId: value }));
                } else {
                  setBlockForm((prev) => ({ ...prev, challengeId: value.value }));
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
            <TextField label="Block JSON" value={blockForm.blockJson} onChange={(e) => setBlockForm((prev) => ({ ...prev, blockJson: e.target.value }))} multiline minRows={3} />
            <Button variant="outlined" component="label">
              Optional image
              <input type="file" hidden onChange={(e) => setBlockImage(e.target.files?.[0] ?? null)} />
            </Button>
            <Button variant="contained" onClick={addBlock}>
              Add block
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Blocks: update block</Typography>
          <Stack spacing={1.5} mt={1}>
            <Autocomplete
              freeSolo
              options={challengeOptions}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={updateBlockForm.challengeId}
              onInputChange={(_, value) => setUpdateBlockForm((prev) => ({ ...prev, challengeId: value }))}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setUpdateBlockForm((prev) => ({ ...prev, challengeId: value }));
                } else {
                  setUpdateBlockForm((prev) => ({ ...prev, challengeId: value.value }));
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
            <TextField label="Block ID" value={updateBlockForm.blockId} onChange={(e) => setUpdateBlockForm((prev) => ({ ...prev, blockId: e.target.value }))} />
            <TextField label="Block JSON" value={updateBlockForm.blockJson} onChange={(e) => setUpdateBlockForm((prev) => ({ ...prev, blockJson: e.target.value }))} multiline minRows={3} />
            <Button variant="outlined" component="label">
              Optional image
              <input type="file" hidden onChange={(e) => setUpdateBlockImage(e.target.files?.[0] ?? null)} />
            </Button>
            <Button variant="contained" onClick={updateBlock}>
              Update block
            </Button>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Blocks: delete block</Typography>
          <Stack spacing={1.5} mt={1}>
            <Autocomplete
              freeSolo
              options={challengeOptions}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={deleteBlock.challengeId}
              onInputChange={(_, value) => setDeleteBlock((prev) => ({ ...prev, challengeId: value }))}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setDeleteBlock((prev) => ({ ...prev, challengeId: value }));
                } else {
                  setDeleteBlock((prev) => ({ ...prev, challengeId: value.value }));
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
            <TextField label="Block ID" value={deleteBlock.blockId} onChange={(e) => setDeleteBlock((prev) => ({ ...prev, blockId: e.target.value }))} />
            <Button color="secondary" variant="contained" onClick={deleteBlockRequest}>
              Delete block
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Blocks: change order</Typography>
          <Stack spacing={1.5} mt={1}>
            <Autocomplete
              freeSolo
              options={challengeOptions}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
              inputValue={orderForm.challengeId}
              onInputChange={(_, value) => setOrderForm((prev) => ({ ...prev, challengeId: value }))}
              onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                  setOrderForm((prev) => ({ ...prev, challengeId: value }));
                } else {
                  setOrderForm((prev) => ({ ...prev, challengeId: value.value }));
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
            <TextField label="New order (comma)" value={orderForm.orders} onChange={(e) => setOrderForm((prev) => ({ ...prev, orders: e.target.value }))} />
            <Button variant="contained" onClick={changeOrder}>
              Change order
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {response?.error && <Notice severity="error" message={response.error} />}
      {response?.ok && <Notice severity="success" message="Admin action completed." />}
    </SectionCard>
  );
}
