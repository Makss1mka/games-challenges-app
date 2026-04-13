import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Alert, Box, IconButton, Stack } from "@mui/material";
import { Close } from "@mui/icons-material";

type NoticeItem = {
  id: number;
  message: string;
  severity: "success" | "info" | "warning" | "error";
};

type NoticeContextValue = {
  push: (severity: NoticeItem["severity"], message: string) => void;
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

export function useNotice() {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error("useNotice must be used inside NoticeProvider");
  }
  return context;
}

export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const timers = useRef(new Map<number, number>());
  const push = useCallback((severity: NoticeItem["severity"], message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, severity, message }]);
    const timeoutId = window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      timers.current.delete(id);
    }, 2000);
    timers.current.set(id, timeoutId);
  }, []);

  const handleClose = useCallback((id: number) => {
    const timerId = timers.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <Box sx={{ position: "fixed", right: 24, bottom: 24, zIndex: 2000 }}>
        <Stack spacing={1}>
          {items.map((item) => (
            <Alert
              key={item.id}
              severity={item.severity}
              action={
                <IconButton color="inherit" size="small" onClick={() => handleClose(item.id)}>
                  <Close fontSize="small" />
                </IconButton>
              }
              sx={{ minWidth: 280 }}
            >
              {item.message}
            </Alert>
          ))}
        </Stack>
      </Box>
    </NoticeContext.Provider>
  );
}
