import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import { AdminOverviewSection } from "../sections/AdminOverviewSection";
import { AdminActionsSection } from "../sections/AdminActionsSection";
import { AdminGamesSection } from "../sections/AdminGamesSection";
import { AdminTagsSection } from "../sections/AdminTagsSection";
import { ChallengesSection } from "../sections/ChallengesSection";
import { ConsoleSection } from "../sections/ConsoleSection";

export default function AdminPage() {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: "Overview", content: <AdminOverviewSection /> },
    { label: "Actions", content: <AdminActionsSection /> },
    { label: "Games", content: <AdminGamesSection /> },
    { label: "Tags", content: <AdminTagsSection /> },
    { label: "Challenges", content: <ChallengesSection /> },
    { label: "Console", content: <ConsoleSection /> }
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Admin panel
        </Typography>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          {tabs.map((item) => (
            <Tab key={item.label} label={item.label} />
          ))}
        </Tabs>
      </Box>

      <Box>{tabs[tab]?.content}</Box>
    </Stack>
  );
}
