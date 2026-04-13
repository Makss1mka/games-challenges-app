import { Paper, Typography } from "@mui/material";

type ResponsePanelProps = {
  title: string;
  payload: unknown;
};

export function ResponsePanel({ title, payload }: ResponsePanelProps) {
  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle1">{title}</Typography>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(payload, null, 2)}
      </pre>
    </Paper>
  );
}
