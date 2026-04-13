import { useEffect, useRef } from "react";
import { useNotice } from "./NoticeProvider";

type NoticeProps = {
  severity: "success" | "info" | "warning" | "error";
  message: string;
};

export function Notice({ severity, message }: NoticeProps) {
  const { push } = useNotice();
  const lastKey = useRef<string>("");

  useEffect(() => {
    const key = `${severity}:${message}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    push(severity, message);
  }, [message, severity, push]);

  return null;
}
