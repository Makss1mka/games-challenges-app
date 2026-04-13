import { Search } from "@mui/icons-material";
import { Button, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { apiFetch } from "../api/client";
import type { UserDto } from "../types";
import { Notice } from "../components/Notice";
import { SectionCard } from "../components/SectionCard";

type ApiResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export function UsersSection() {
  const [me, setMe] = useState<UserDto | null>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [userSearch, setUserSearch] = useState({ q: "", skip: 0, take: 10 });
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const updateResponse = (result: ApiResponse) => setResponse(result);

  const fetchMe = async () => {
    const result = await apiFetch<UserDto>("/api/me");
    updateResponse(result);
    if (result.ok && result.data) {
      setMe(result.data as UserDto);
    }
  };

  const searchUsers = async () => {
    const result = await apiFetch<UserDto[]>(
      `/api/users?q=${encodeURIComponent(userSearch.q)}&skip=${userSearch.skip}&take=${userSearch.take}`
    );
    updateResponse(result);
    if (result.ok && result.data) {
      setUsers(result.data as UserDto[]);
    }
  };

  const roleLabel = (role: string | number) => {
    const map = ["User", "Moderator", "Admin"];
    const index = Number(role);
    return Number.isFinite(index) ? map[index] ?? String(role) : String(role);
  };

  const statusLabel = (status: string | number) => {
    const map = ["Active", "Blocked", "Deleted"];
    const index = Number(status);
    return Number.isFinite(index) ? map[index] ?? String(status) : String(status);
  };

  return (
    <SectionCard title="Profile and users" subtitle="Verify auth and user search.">
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
        <Button variant="contained" onClick={fetchMe}>
          Load profile
        </Button>
        <TextField
          label="Search users"
          value={userSearch.q}
          onChange={(e) => setUserSearch((prev) => ({ ...prev, q: e.target.value }))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={searchUsers}>
                  <Search />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Stack>
      {me && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography fontWeight={700}>{me.username}</Typography>
          <Typography variant="body2" color="text.secondary">
            {me.email} - {roleLabel(me.role)} - {statusLabel(me.status)}
          </Typography>
        </Paper>
      )}
      {users.length > 0 && (
        <Stack spacing={1} mt={2}>
          {users.map((user) => (
            <Paper key={user.id} sx={{ p: 1.5 }}>
              <Typography fontWeight={600}>{user.username}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email} - {roleLabel(user.role)} - {statusLabel(user.status)}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}
      {response?.error && <Notice severity="error" message={response.error} />}
    </SectionCard>
  );
}
