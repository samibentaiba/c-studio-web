export type LogType = "info" | "success" | "error" | "warning";

export interface LogMessage {
  id: string;
  type: LogType;
  content: string;
  timestamp: string;
}

export type FileType = "file" | "folder";

export interface FileSystemItem {
  id: string;
  name: string;
  type: FileType;
  content?: string; // Only for files
  children?: FileSystemItem[]; // Only for folders
  isOpen?: boolean; // For folder expansion state
}
