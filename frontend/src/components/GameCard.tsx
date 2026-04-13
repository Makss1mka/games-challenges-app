import { Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { GameDto } from "../types";

type GameCardProps = {
  game: GameDto;
  detailed?: boolean;
  count?: number;
  sx?: SxProps<Theme>;
  maxTags?: number;
};

export function GameCard({ game, detailed = false, count, sx, maxTags }: GameCardProps) {
  const normalizeMeta = (value?: string | null) => {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const lower = trimmed.toLowerCase();
    if (lower === "-" || lower === "unknown" || lower === "unknown studio" || lower === "n/a" || lower === "none") {
      return null;
    }
    return trimmed;
  };

  const meta = [normalizeMeta(game.developer), normalizeMeta(game.publisher), normalizeMeta(game.releaseDate)]
    .filter(Boolean)
    .join(" - ");

  const tagsToShow =
    typeof maxTags === "number" && maxTags >= 0 ? game.tags?.slice(0, maxTags) : game.tags;

  return (
    <Paper
      sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", ...sx }}
    >
      <Stack spacing={1} sx={{ flexGrow: 1 }}>
        {game.imageUrl && (
          <img
            src={game.imageUrl}
            alt={game.title}
            style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 12 }}
          />
        )}
        <Typography fontWeight={700}>{game.title}</Typography>
        {meta ? (
          <Typography variant="body2" color="text.secondary">
            {meta}
          </Typography>
        ) : null}
        {typeof count === "number" ? (
          <Typography variant="caption" color="text.secondary">
            Challenges: {count}
          </Typography>
        ) : null}
        {tagsToShow?.length ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1.5 }}>
            {tagsToShow.map((tag) => (
              <Typography
                key={tag}
                variant="caption"
                sx={{ px: 1, py: 0.5, border: "1px solid #e0e0e0", borderRadius: 12 }}
              >
                {tag}
              </Typography>
            ))}
          </Stack>
        ) : null}
        {detailed && (
          <Typography variant="body2">{game.description || "No description"}</Typography>
        )}
      </Stack>
    </Paper>
  );
}
