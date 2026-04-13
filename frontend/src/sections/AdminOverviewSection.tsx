import { List, ListItem, ListItemText, Typography } from "@mui/material";
import { SectionCard } from "../components/SectionCard";

export function AdminOverviewSection() {
  return (
    <SectionCard title="Admin console" subtitle="Requests that typically require elevated access.">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        These endpoints are protected by auth and are intended for administrators or moderators.
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary="POST /api/games" secondary="Create a new game entry." />
        </ListItem>
        <ListItem>
          <ListItemText primary="POST /api/challenges" secondary="Create a challenge (requires auth)." />
        </ListItem>
        <ListItem>
          <ListItemText primary="PATCH /api/challenges/{id}" secondary="Update challenge metadata." />
        </ListItem>
        <ListItem>
          <ListItemText primary="DELETE /api/challenges/{id}" secondary="Remove a challenge." />
        </ListItem>
      </List>
    </SectionCard>
  );
}
