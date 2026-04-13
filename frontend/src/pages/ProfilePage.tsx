import { Box, Button, Grid, Pagination, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { apiFetch, clearTokens } from "../api/client";
import type { ChallengeListResponse, UserDto } from "../types";
import { Notice } from "../components/Notice";
import { LibrarySection } from "../sections/LibrarySection";
import { useNavigate } from "react-router-dom";
import { ChallengeCard } from "../components/ChallengeCard";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<ChallengeListResponse | null>(null);
  const [challengePage, setChallengePage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const result = await apiFetch<UserDto>("/api/me");
      if (result.ok && result.data) {
        setProfile(result.data as UserDto);
      } else {
        if (result.status === 401) {
          navigate("/auth");
          return;
        }
        setError(result.error || "Failed to load profile");
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const loadChallenges = async () => {
      const result = await apiFetch<ChallengeListResponse>(
        `/api/challenges/search?user_id=${profile.id}&page_size=6&page_num=${challengePage}`
      );
      if (result.ok && result.data) {
        setChallenges(result.data as ChallengeListResponse);
      }
    };
    void loadChallenges();
  }, [profile, challengePage]);

  const deleteChallenge = async (challengeId: string) => {
    if (!profile) return;
    const result = await apiFetch(`/api/challenges/${challengeId}`, { method: "DELETE" });
    if (result.ok) {
      const refreshed = await apiFetch<ChallengeListResponse>(
        `/api/challenges/search?user_id=${profile.id}&page_size=6&page_num=${challengePage}`
      );
      if (refreshed.ok && refreshed.data) {
        setChallenges(refreshed.data as ChallengeListResponse);
      }
    } else {
      setError(result.error || "Failed to delete challenge.");
    }
  };

  const logout = () => {
    clearTokens();
    navigate("/auth");
  };

  return (
    <Stack spacing={3}>
      <Paper className="glass-card" sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          My profile
        </Typography>
        {profile ? (
          <Box>
            <Typography fontWeight={700}>{profile.username}</Typography>
            <Typography variant="body2" color="text.secondary">
              {profile.email}
            </Typography>
            <Button variant="outlined" color="secondary" sx={{ mt: 2 }} onClick={logout}>
              Sign out
            </Button>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Loading profile...
          </Typography>
        )}
      </Paper>
      <Paper className="glass-card" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          My challenges
        </Typography>
        {challenges?.data?.length ? (
          <Grid container spacing={2}>
            {challenges.data.map((challenge) => (
              <Grid item xs={12} md={6} key={challenge.id}>
                <Stack spacing={1}>
                  <ChallengeCard
                    challenge={challenge}
                    onClick={() => navigate(`/challenges/${challenge.id}`)}
                  />
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => deleteChallenge(challenge.id)}
                    disabled={
                      String(profile.role).toLowerCase() !== "admin" &&
                      profile.id !== challenge.user_id
                    }
                  >
                    Delete challenge
                  </Button>
                </Stack>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No challenges yet.
          </Typography>
        )}
        <Stack direction="row" spacing={2} alignItems="center" mt={2}>
          <Pagination
            count={Math.max(challenges?.total_pages ?? 1, 1)}
            page={challengePage}
            onChange={(_, value) => setChallengePage(value)}
            color="secondary"
          />
          <Typography variant="caption" color="text.secondary">
            Page {challengePage}
          </Typography>
        </Stack>
      </Paper>
      <LibrarySection />
      {error && <Notice severity="error" message={error} />}
    </Stack>
  );
}
