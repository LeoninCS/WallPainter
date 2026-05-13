export type Settings = {
  token: string;
  rememberToken: boolean;
  username: string;
  repo: string;
  branch: string;
  authorName: string;
  authorEmail: string;
  publicRepo: boolean;
};

export type AccountInfo = {
  login: string;
  id: number;
  name: string;
  email: string;
  htmlUrl: string;
  noreplyMail: string;
};

export type PaintCell = {
  date: string;
  level: number;
};

export type RunRequest = {
  token: string;
  username: string;
  repo: string;
  branch: string;
  authorName: string;
  authorEmail: string;
  publicRepo: boolean;
  year: number;
  cells: PaintCell[];
};

export type RunResult = {
  repoUrl: string;
  profileUrl: string;
  commitCount: number;
  daysPainted: number;
  createdRepo: boolean;
  branch: string;
};

export type ProgressEvent = {
  step: string;
  message: string;
  completed: number;
  total: number;
  level: string;
};

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          LoadSettings: () => Promise<Settings>;
          SaveSettings: (settings: Settings) => Promise<void>;
          ResolveAccount: (token: string) => Promise<AccountInfo>;
          RunPainting: (request: RunRequest) => Promise<RunResult>;
        };
      };
    };
    runtime?: {
      EventsOn: (eventName: string, callback: (data: ProgressEvent) => void) => () => void;
    };
  }
}

export {};

