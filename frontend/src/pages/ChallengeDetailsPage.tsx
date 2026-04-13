import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import Icon from "@mdi/react";
import { mdiThumbUpOutline, mdiThumbDownOutline } from "@mdi/js";
import { Close } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getApiBase } from "../api/client";
import type { Challenge, ChallengeCommentsResponse, ChallengeReaction, UserDto } from "../types";
import { Notice } from "../components/Notice";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export default function ChallengeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [comments, setComments] = useState<ChallengeCommentsResponse | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);

  const updateResponse = (result: ApiResponse) => setResponse(result);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const result = await apiFetch<Challenge>(`/api/challenges/${id}`);
      updateResponse(result);
      if (result.ok && result.data) {
        setChallenge(result.data as Challenge);
      }
      await loadComments();
    };
    void load();
  }, [id]);

  useEffect(() => {
    const loadUser = async () => {
      const result = await apiFetch<UserDto>("/api/me");
      if (result.ok && result.data) {
        setCurrentUser(result.data as UserDto);
      }
    };
    void loadUser();
  }, []);

  const loadComments = async () => {
    if (!id) return;
    const result = await apiFetch<ChallengeCommentsResponse>(
      `/api/challenges/${id}/comments?page_size=10&page_num=1`
    );
    if (result.ok && result.data) {
      setComments(result.data as ChallengeCommentsResponse);
    }
  };

  const sendReaction = async (reaction: "like" | "dislike") => {
    if (!id) return;
    const result = await apiFetch<ChallengeReaction>(`/api/challenges/${id}/${reaction}`, {
      method: "POST"
    });
    updateResponse(result);
    if (result.ok && result.data && challenge) {
      const next = result.data as ChallengeReaction;
      setChallenge({
        ...challenge,
        likes_count: next.likes_count,
        dislikes_count: next.dislikes_count
      });
    }
  };

  const submitComment = async () => {
    if (!id) return;
    if (!commentText.trim()) {
      updateResponse({ ok: false, status: 400, error: "Comment text is required." });
      return;
    }
    const form = new FormData();
    form.append("message", commentText.trim());
    if (commentFiles.length > 0) {
      commentFiles.forEach((file) => form.append("screenshots", file));
    }
    const result = await apiFetch(`/api/challenges/${id}/comments`, { method: "POST", body: form });
    updateResponse(result);
    if (result.ok) {
      setCommentText("");
      setCommentFiles([]);
      await loadComments();
    }
  };

  const startEditComment = (commentId: string, message: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(message);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditedComment = async () => {
    if (!id || !editingCommentId) return;
    if (!editingCommentText.trim()) {
      updateResponse({ ok: false, status: 400, error: "Comment text is required." });
      return;
    }
    const result = await apiFetch(
      `/api/challenges/${id}/comments/${editingCommentId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ message: editingCommentText.trim() })
      }
    );
    updateResponse(result);
    if (result.ok) {
      cancelEditComment();
      await loadComments();
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!id) return;
    const result = await apiFetch(`/api/challenges/${id}/comments/${commentId}`, {
      method: "DELETE"
    });
    updateResponse(result);
    if (result.ok) {
      await loadComments();
    }
  };

  const descriptionBlocks = useMemo(() => {
    return Array.isArray(challenge?.description) ? challenge?.description : [];
  }, [challenge]);

  const resolveImage = (path: string) => {
    if (path.startsWith("http")) return path;
    return `${getApiBase().replace(/\/$/, "")}/api/challenges/file/${path}`;
  };

  const canDelete =
    !!currentUser &&
    !!challenge &&
    (String(currentUser.role).toLowerCase() === "admin" || currentUser.id === challenge.user_id);

  const deleteChallenge = async () => {
    if (!id || !canDelete) return;
    const result = await apiFetch(`/api/challenges/${id}`, { method: "DELETE" });
    updateResponse(result);
    if (result.ok) {
      navigate("/profile");
    }
  };

  return (
    <Stack spacing={3}>
      <Button variant="text" onClick={() => navigate(-1)}>
        Back
      </Button>

      {challenge ? (
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={700}>
            {challenge.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {challenge.game?.name} - {challenge.status}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            By {challenge.author_name}
          </Typography>
          {challenge.card_picture_url && (
            <img
              src={resolveImage(challenge.card_picture_url)}
              alt={challenge.name}
              style={{ width: "100%", borderRadius: 16, height: "auto", objectFit: "contain" }}
            />
          )}

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={() => sendReaction("like")}
              startIcon={<Icon path={mdiThumbUpOutline} size={0.9} />}
            >
              Like ({challenge.likes_count})
            </Button>
            <Button
              variant="outlined"
              onClick={() => sendReaction("dislike")}
              startIcon={<Icon path={mdiThumbDownOutline} size={0.9} />}
            >
              Dislike ({challenge.dislikes_count})
            </Button>
            {canDelete && (
              <Button color="secondary" variant="outlined" onClick={deleteChallenge}>
                Delete challenge
              </Button>
            )}
          </Stack>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={700} gutterBottom>
              Description
            </Typography>
            <Stack spacing={2}>
              {descriptionBlocks.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {challenge.card_description}
                </Typography>
              )}
              {descriptionBlocks.map((block, index) => {
                if (block.type === "text") {
                  return (
                    <Typography key={`block-${index}`} variant="body2">
                      {block.content}
                    </Typography>
                  );
                }
                if (block.type === "picture") {
                  return (
                    <img
                      key={`block-${index}`}
                      src={resolveImage(block.content)}
                      alt={block.alt_text || "challenge"}
                      style={{ width: "100%", borderRadius: 12, height: "auto", objectFit: "contain" }}
                    />
                  );
                }
                if (block.type === "link") {
                  return (
                    <a key={`block-${index}`} href={block.content} target="_blank" rel="noreferrer">
                      {block.text || block.content}
                    </a>
                  );
                }
                return null;
              })}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={700} gutterBottom>
              Comments
            </Typography>
            <Stack spacing={2}>
              {commentFiles.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {commentFiles.map((file) => {
                    const url = URL.createObjectURL(file);
                    return (
                      <Box
                        key={file.name + file.size}
                        sx={{
                          width: 64,
                          height: 64,
                          position: "relative",
                          borderRadius: 1,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.12)"
                        }}
                      >
                        <img
                          src={url}
                          alt={file.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onLoad={() => URL.revokeObjectURL(url)}
                        />
                        <IconButton
                          size="small"
                          onClick={() =>
                            setCommentFiles((prev) => prev.filter((item) => item !== file))
                          }
                          sx={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            bgcolor: "rgba(0,0,0,0.6)",
                            color: "white"
                          }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>
              )}
              <TextField
                label="Write a comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                multiline
                minRows={3}
              />
              <Button variant="outlined" component="label">
                Attach screenshots
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) {
                      setCommentFiles((prev) => [...prev, ...files]);
                    }
                    e.currentTarget.value = "";
                  }}
                />
              </Button>
              <Button variant="contained" onClick={submitComment}>
                Post comment
              </Button>
            </Stack>

            <Stack spacing={2} mt={3}>
              {comments?.data?.map((comment) => (
                <Paper key={comment.id} sx={{ p: 2 }}>
                  <Typography fontWeight={700}>{comment.author_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(comment.created_at).toLocaleString()}
                  </Typography>
                  {editingCommentId === comment.id ? (
                    <Stack spacing={1} mt={1}>
                      <TextField
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        multiline
                        minRows={3}
                      />
                      <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={saveEditedComment}>
                          Save
                        </Button>
                        <Button variant="outlined" onClick={cancelEditComment}>
                          Cancel
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Typography variant="body2" mt={1}>
                      {comment.message}
                    </Typography>
                  )}
                  {(currentUser &&
                    (String(currentUser.role).toLowerCase() === "admin" ||
                      currentUser.id === comment.user_id)) && (
                    <Stack direction="row" spacing={1} mt={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => startEditComment(comment.id, comment.message)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="secondary"
                        variant="outlined"
                        onClick={() => deleteComment(comment.id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  )}
                  {comment.attachments?.length ? (
                    <Grid container spacing={1} mt={1}>
                      {comment.attachments.map((path) => (
                        <Grid item xs={12} md={6} key={path}>
                          <img
                            src={resolveImage(path)}
                            alt="comment"
                            style={{ width: "100%", borderRadius: 12, height: "auto", objectFit: "contain" }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  ) : null}
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Loading challenge...
        </Typography>
      )}

      {response?.error && <Notice severity="error" message={response.error} />}
    </Stack>
  );
}
