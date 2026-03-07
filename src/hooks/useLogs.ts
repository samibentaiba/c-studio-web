import { useState } from "react";
import { LogMessage, LogType } from "@/types";

export function useLogs() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<LogMessage[]>([]);

  const addLog = (type: LogType, content: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        type,
        content,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const addTerminalLog = (type: LogType, content: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        type,
        content,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return {
    logs,
    setLogs,
    terminalLogs,
    setTerminalLogs,
    addLog,
    addTerminalLog,
  };
}
