import { Chip, Paper, Stack, Typography } from "@mui/material";
import { getApiBase } from "../api/client";
import type { Challenge } from "../types";

type ChallengeCardProps = {
  challenge: Challenge;
  onClick?: () => void;
};

export function ChallengeCard({ challenge, onClick }: ChallengeCardProps) {
  const imageUrl = challenge.card_picture_url
    ? challenge.card_picture_url.startsWith("http")
      ? challenge.card_picture_url
      : `${getApiBase().replace(/\/$/, "")}/api/challenges/file/${challenge.card_picture_url}`
    : null;

  return (
    <Paper sx={{ p: 2, height: "100%", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <Stack spacing={1}>
        <Typography fontWeight={700}>{challenge.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {challenge.game?.name} - {challenge.status}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          By {challenge.author_name}
        </Typography>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={challenge.name}
            style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }}
          />
        )}
        <Typography variant="body2">{challenge.card_description}</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {challenge.tags?.map((tag) => (
            <Chip key={tag} label={tag} size="small" />
          ))}
        </Stack>
        <Stack direction="row" spacing={2} mt={1}>
          <Typography variant="caption">Likes: {challenge.likes_count}</Typography>
          <Typography variant="caption">Dislikes: {challenge.dislikes_count}</Typography>
          <Typography variant="caption">Comments: {challenge.comments_count}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
