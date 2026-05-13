import { useEffect, useMemo, useState } from "react";
import { LoadSettings, ResolveAccount, RunPainting, SaveSettings } from "../wailsjs/go/main/App";
import { painter } from "../wailsjs/go/models";
import { EventsOn } from "../wailsjs/runtime/runtime";
import type { AccountInfo, PaintCell, ProgressEvent, RunResult, Settings } from "./wails";

type DayCell = {
  date: string;
  day: number;
  month: number;
  label: string;
  inYear: boolean;
};

type Week = DayCell[];
type Language = "en" | "zh";

const currentYear = new Date().getFullYear();
const languageStorageKey = "wallpainter-language";
const languageLocales: Record<Language, string> = {
  en: "en-US",
  zh: "zh-CN"
};
const defaultSettings: Settings = {
  token: "",
  rememberToken: false,
  username: "",
  repo: "wallpainter-art",
  branch: "main",
  authorName: "",
  authorEmail: "",
  publicRepo: true
};

const copy = {
  en: {
    language: "Language",
    english: "English",
    chinese: "中文",
    tagline: "Paint a GitHub contribution graph, then push generated commits to a dedicated repository.",
    days: "days",
    commits: "commits",
    year: "Year",
    boardAria: "Contribution graph painter",
    brushIntensity: "Brush intensity",
    commitsPerDay: "commits per day",
    fillDemo: "Fill demo",
    clear: "Clear",
    less: "Less",
    more: "More",
    intensity: "intensity",
    github: "GitHub",
    token: "Token",
    resolving: "Resolving",
    useTokenAccount: "Use token account",
    remember: "Remember",
    username: "Username",
    repository: "Repository",
    branch: "Branch",
    createPublicRepo: "Create public repo when missing",
    commitAuthor: "Commit Author",
    name: "Name",
    email: "Email",
    run: "Run",
    painting: "Painting",
    runAndPush: "Run and push",
    saveSettings: "Save settings",
    runProgress: "Run progress",
    done: "Done",
    openRepository: "Open repository",
    openProfile: "Open profile",
    progressEmpty: "Progress logs appear here.",
    backendUnavailable: "Wails backend is unavailable",
    genericError: "Something went wrong",
    monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    dayLabels: ["", "Mon", "", "Wed", "", "Fri", ""],
    levelLabels: ["Empty", "Low", "Medium", "High", "Max"],
    resultLine: (commits: number, days: number) => `${commits} commits across ${days} days`,
    progress: {
      settingsSaved: "Settings saved",
      resolvingAccount: "Resolving GitHub account",
      resolvedAccount: "Resolved GitHub account",
      checkingRepo: "Checking target repository",
      createdRepo: "Created target repository",
      preparingRepo: "Preparing local repository",
      generatedCommit: (date: string, current: string, total: string) => `Generated ${date} commit ${current}/${total}`,
      pushing: "Pushing commits to GitHub",
      finished: "Finished painting contribution graph"
    }
  },
  zh: {
    language: "语言",
    english: "English",
    chinese: "中文",
    tagline: "绘制 GitHub 贡献图，然后把生成的提交推送到专用仓库。",
    days: "天",
    commits: "提交",
    year: "年份",
    boardAria: "贡献图绘制器",
    brushIntensity: "画笔强度",
    commitsPerDay: "次提交/天",
    fillDemo: "填充示例",
    clear: "清空",
    less: "少",
    more: "多",
    intensity: "强度",
    github: "GitHub",
    token: "Token",
    resolving: "查询中",
    useTokenAccount: "使用 Token 账号",
    remember: "记住",
    username: "用户名",
    repository: "仓库",
    branch: "分支",
    createPublicRepo: "缺失时创建公开仓库",
    commitAuthor: "提交作者",
    name: "名称",
    email: "邮箱",
    run: "运行",
    painting: "绘制中",
    runAndPush: "运行并推送",
    saveSettings: "保存设置",
    runProgress: "运行进度",
    done: "完成",
    openRepository: "打开仓库",
    openProfile: "打开主页",
    progressEmpty: "进度日志会显示在这里。",
    backendUnavailable: "Wails 后端不可用",
    genericError: "出错了",
    monthNames: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    dayLabels: ["", "周一", "", "周三", "", "周五", ""],
    levelLabels: ["空", "低", "中", "高", "最高"],
    resultLine: (commits: number, days: number) => `${commits} 次提交，覆盖 ${days} 天`,
    progress: {
      settingsSaved: "设置已保存",
      resolvingAccount: "正在解析 GitHub 账号",
      resolvedAccount: "已解析 GitHub 账号",
      checkingRepo: "正在检查目标仓库",
      createdRepo: "已创建目标仓库",
      preparingRepo: "正在准备本地仓库",
      generatedCommit: (date: string, current: string, total: string) => `已生成 ${date} 提交 ${current}/${total}`,
      pushing: "正在推送提交到 GitHub",
      finished: "贡献图绘制完成"
    }
  }
} as const;

function App() {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [year, setYear] = useState(currentYear);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [paintLevel, setPaintLevel] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");

  const t = copy[language];
  const levelLabels = t.levelLabels;
  const weeks = useMemo(() => buildWeeks(year, language), [year, language]);
  const monthLabels = useMemo(() => buildMonthLabels(weeks, language), [weeks, language]);
  const paintedCells = useMemo<PaintCell[]>(
    () =>
      Object.entries(levels)
        .filter(([, level]) => level > 0)
        .map(([date, level]) => ({ date, level }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [levels]
  );
  const commitTotal = useMemo(() => paintedCells.reduce((sum, cell) => sum + commitCount(cell.level), 0), [paintedCells]);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  useEffect(() => {
    LoadSettings()
      .then((loaded) => {
        setSettings({ ...defaultSettings, ...loaded });
      })
      .catch((err) => setError(readError(err, language)));

    const unsubscribe = EventsOn("wallpainter:progress", (event: ProgressEvent) => {
      setProgress((items) => [...items.slice(-99), event]);
    });
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function paint(date: string, inYear: boolean) {
    if (!inYear || isRunning) {
      return;
    }
    setLevels((current) => ({ ...current, [date]: paintLevel }));
  }

  function erase(event: React.MouseEvent, date: string, inYear: boolean) {
    event.preventDefault();
    if (!inYear || isRunning) {
      return;
    }
    setLevels((current) => {
      const next = { ...current };
      delete next[date];
      return next;
    });
  }

  function clearBoard() {
    setLevels({});
    setResult(null);
    setError("");
  }

  function fillTestPattern() {
    const next: Record<string, number> = {};
    weeks.forEach((week, weekIndex) => {
      week.forEach((cell) => {
        if (cell.inYear && (weekIndex + cell.day) % 5 === 0) {
          next[cell.date] = ((weekIndex + cell.day) % 4) + 1;
        }
      });
    });
    setLevels(next);
    setResult(null);
    setError("");
  }

  async function saveSettings() {
    setError("");
    try {
      await SaveSettings(settings);
      setProgress((items) => [
        ...items.slice(-99),
        {
          step: "settings",
          message: t.progress.settingsSaved,
          completed: 0,
          total: 0,
          level: "success"
        }
      ]);
    } catch (err) {
      setError(readError(err, language));
    }
  }

  async function resolveAccount() {
    setError("");
    setIsResolving(true);
    try {
      const info: AccountInfo | undefined = await ResolveAccount(settings.token);
      if (!info) {
        throw new Error(t.backendUnavailable);
      }
      setSettings((current) => ({
        ...current,
        username: info.login,
        authorName: info.name || info.login,
        authorEmail: info.noreplyMail || info.email
      }));
      setProgress((items) => [
        ...items.slice(-99),
        {
          step: "account",
          message: `${t.progress.resolvedAccount}: ${info.login}`,
          completed: 0,
          total: 0,
          level: "success"
        }
      ]);
    } catch (err) {
      setError(readError(err, language));
    } finally {
      setIsResolving(false);
    }
  }

  async function runPainting() {
    setError("");
    setResult(null);
    setProgress([]);
    setIsRunning(true);
    try {
      await SaveSettings(settings);
      const request = new painter.RunRequest({
        ...settings,
        year,
        cells: paintedCells
      });
      const runResult = await RunPainting(request);
      if (!runResult) {
        throw new Error(t.backendUnavailable);
      }
      setResult(runResult);
    } catch (err) {
      setError(readError(err, language));
    } finally {
      setIsRunning(false);
    }
  }

  const progressPercent =
    progress.length > 0 && progress[progress.length - 1].total > 0
      ? Math.round((progress[progress.length - 1].completed / progress[progress.length - 1].total) * 100)
      : 0;

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>WallPainter</h1>
            <p>{t.tagline}</p>
          </div>
          <div className="topbar-actions">
            <label className="language-field">
              {t.language}
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} disabled={isRunning}>
                <option value="en">{t.english}</option>
                <option value="zh">{t.chinese}</option>
              </select>
            </label>
            <div className="summary-strip">
              <div>
                <strong>{paintedCells.length}</strong>
                <span>{t.days}</span>
              </div>
              <div>
                <strong>{commitTotal}</strong>
                <span>{t.commits}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="board-panel" aria-label={t.boardAria}>
          <div className="board-toolbar">
            <label>
              {t.year}
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} disabled={isRunning}>
                {buildYearOptions().map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="level-picker" aria-label={t.brushIntensity}>
              {levelLabels.slice(1).map((label, index) => {
                const level = index + 1;
                return (
                  <button
                    key={level}
                    className={`level-button level-${level} ${paintLevel === level ? "active" : ""}`}
                    onClick={() => setPaintLevel(level)}
                    type="button"
                    title={`${label}: ${commitCount(level)} ${t.commitsPerDay}`}
                    disabled={isRunning}
                  >
                    <span />
                  </button>
                );
              })}
            </div>
            <button type="button" className="ghost-button" onClick={fillTestPattern} disabled={isRunning}>
              {t.fillDemo}
            </button>
            <button type="button" className="ghost-button" onClick={clearBoard} disabled={isRunning}>
              {t.clear}
            </button>
          </div>

          <div className="graph-wrap">
            <div className="month-row" style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell-size))` }}>
              {monthLabels.map((label, index) => (
                <span key={`${label}-${index}`} style={{ gridColumn: `${index + 1} / span 1` }}>
                  {label}
                </span>
              ))}
            </div>
            <div className="graph-row">
              <div className="weekday-col">
                {t.dayLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
              <div className="graph-grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell-size))` }}>
                {weeks.flatMap((week, weekIndex) =>
                  week.map((cell) => {
                    const level = levels[cell.date] || 0;
                    return (
                      <button
                        key={`${weekIndex}-${cell.day}`}
                        type="button"
                        className={`day-cell level-${level} ${cell.inYear ? "" : "outside-year"}`}
                        aria-label={`${cell.label}, ${levelLabels[level]}`}
                        title={`${cell.label}: ${commitCount(level)} ${t.commits}`}
                        onClick={() => paint(cell.date, cell.inYear)}
                        onContextMenu={(event) => erase(event, cell.date, cell.inYear)}
                        disabled={!cell.inYear || isRunning}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="legend">
            <span>{t.less}</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className={`legend-cell level-${level}`} title={`${levelLabels[level]} ${t.intensity}`} />
            ))}
            <span>{t.more}</span>
          </div>
        </section>
      </section>

      <aside className="side-panel">
        <section className="panel-block">
          <h2>{t.github}</h2>
          <label>
            {t.token}
            <input
              type="password"
              value={settings.token}
              onChange={(event) => updateSetting("token", event.target.value)}
              placeholder="ghp_..."
              disabled={isRunning}
            />
          </label>
          <div className="inline-actions">
            <button type="button" onClick={resolveAccount} disabled={isRunning || isResolving || !settings.token}>
              {isResolving ? t.resolving : t.useTokenAccount}
            </button>
            <label className="check-row">
              <input
                type="checkbox"
                checked={settings.rememberToken}
                onChange={(event) => updateSetting("rememberToken", event.target.checked)}
                disabled={isRunning}
              />
              {t.remember}
            </label>
          </div>
          <label>
            {t.username}
            <input
              value={settings.username}
              onChange={(event) => updateSetting("username", event.target.value)}
              placeholder="octocat"
              disabled={isRunning}
            />
          </label>
          <label>
            {t.repository}
            <input
              value={settings.repo}
              onChange={(event) => updateSetting("repo", event.target.value)}
              placeholder="wallpainter-art"
              disabled={isRunning}
            />
          </label>
          <label>
            {t.branch}
            <input
              value={settings.branch}
              onChange={(event) => updateSetting("branch", event.target.value)}
              placeholder="main"
              disabled={isRunning}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.publicRepo}
              onChange={(event) => updateSetting("publicRepo", event.target.checked)}
              disabled={isRunning}
            />
            {t.createPublicRepo}
          </label>
        </section>

        <section className="panel-block">
          <h2>{t.commitAuthor}</h2>
          <label>
            {t.name}
            <input
              value={settings.authorName}
              onChange={(event) => updateSetting("authorName", event.target.value)}
              placeholder="GitHub display name"
              disabled={isRunning}
            />
          </label>
          <label>
            {t.email}
            <input
              value={settings.authorEmail}
              onChange={(event) => updateSetting("authorEmail", event.target.value)}
              placeholder="123456+user@users.noreply.github.com"
              disabled={isRunning}
            />
          </label>
        </section>

        <section className="panel-block">
          <h2>{t.run}</h2>
          <button
            type="button"
            className="run-button"
            onClick={runPainting}
            disabled={isRunning || paintedCells.length === 0 || !settings.token}
          >
            {isRunning ? t.painting : t.runAndPush}
          </button>
          <button type="button" className="secondary-button" onClick={saveSettings} disabled={isRunning}>
            {t.saveSettings}
          </button>

          <div className="progress-track" aria-label={t.runProgress}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>

          {error && <p className="error-text">{error}</p>}

          {result && (
            <div className="result-box">
              <strong>{t.done}</strong>
              <span>{t.resultLine(result.commitCount, result.daysPainted)}</span>
              <a href={result.repoUrl} target="_blank" rel="noreferrer">{t.openRepository}</a>
              <a href={result.profileUrl} target="_blank" rel="noreferrer">{t.openProfile}</a>
            </div>
          )}

          <div className="log-box">
            {progress.length === 0 ? (
              <span className="muted">{t.progressEmpty}</span>
            ) : (
              progress
                .slice()
                .reverse()
                .map((item, index) => (
                  <p key={`${item.step}-${index}`} className={`log-line ${item.level}`}>
                    {translateProgress(item, language)}
                  </p>
                ))
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}

function readStoredLanguage(): Language {
  const stored = window.localStorage.getItem(languageStorageKey);
  return stored === "zh" || stored === "en" ? stored : "en";
}

function buildWeeks(year: number, language: Language): Week[] {
  const first = new Date(Date.UTC(year, 0, 1));
  const last = new Date(Date.UTC(year, 11, 31));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());
  const end = new Date(last);
  end.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));

  const weeks: Week[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const week: DayCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const copy = new Date(cursor);
      const date = copy.toISOString().slice(0, 10);
      week.push({
        date,
        day,
        month: copy.getUTCMonth(),
        label: copy.toLocaleDateString(languageLocales[language], {
          timeZone: "UTC",
          year: "numeric",
          month: "short",
          day: "numeric"
        }),
        inYear: copy.getUTCFullYear() === year
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function buildMonthLabels(weeks: Week[], language: Language) {
  let previousMonth = -1;
  return weeks.map((week) => {
    const firstInMonth = week.find((cell) => cell.inYear && cell.month !== previousMonth);
    if (!firstInMonth) {
      return "";
    }
    previousMonth = firstInMonth.month;
    return copy[language].monthNames[firstInMonth.month];
  });
}

function buildYearOptions() {
  const years: number[] = [];
  for (let year = currentYear; year >= 2008; year -= 1) {
    years.push(year);
  }
  return years;
}

function commitCount(level: number) {
  if (level === 1) {
    return 1;
  }
  if (level === 2) {
    return 3;
  }
  if (level === 3) {
    return 6;
  }
  if (level === 4) {
    return 10;
  }
  return 0;
}

function translateProgress(event: ProgressEvent, language: Language) {
  const t = copy[language].progress;
  if (event.step === "settings") {
    return t.settingsSaved;
  }
  if (event.step === "account") {
    const account = event.message.match(/^Resolved GitHub account: (.+)$/);
    if (account) {
      return `${t.resolvedAccount}: ${account[1]}`;
    }
    return t.resolvingAccount;
  }
  if (event.step === "repo") {
    return event.message === "Created target repository" ? t.createdRepo : t.checkingRepo;
  }
  if (event.step === "clone") {
    return t.preparingRepo;
  }
  if (event.step === "commit") {
    const commit = event.message.match(/^Generated (\d{4}-\d{2}-\d{2}) commit (\d+)\/(\d+)$/);
    if (commit) {
      return t.generatedCommit(commit[1], commit[2], commit[3]);
    }
  }
  if (event.step === "push") {
    return t.pushing;
  }
  if (event.step === "done") {
    return t.finished;
  }
  return event.message;
}

function readError(err: unknown, language: Language) {
  const fallback = copy[language].genericError;
  if (err instanceof Error) {
    return translateError(err.message, language);
  }
  if (typeof err === "string") {
    return translateError(err, language);
  }
  return fallback;
}

function translateError(message: string, language: Language) {
  if (language === "en") {
    return message;
  }
  if (message === "Wails backend is unavailable") {
    return copy.zh.backendUnavailable;
  }
  if (message === "GitHub token is required") {
    return "需要填写 GitHub token";
  }
  if (message === "paint at least one day before running") {
    return "运行前至少绘制一天";
  }
  if (message === "repo must be a repository name, for example wallpainter-art") {
    return "仓库需要填写仓库名，例如 wallpainter-art";
  }
  if (message === "branch is required") {
    return "需要填写分支";
  }
  const year = message.match(/^year must be between 2008 and (\d+)$/);
  if (year) {
    return `年份需要在 2008 到 ${year[1]} 之间`;
  }
  const outsideYear = message.match(/^date (\d{4}-\d{2}-\d{2}) is outside selected year (\d+)$/);
  if (outsideYear) {
    return `日期 ${outsideYear[1]} 超出所选年份 ${outsideYear[2]}`;
  }
  const invalidLevel = message.match(/^invalid level for (.+)$/);
  if (invalidLevel) {
    return `${invalidLevel[1]} 的强度无效`;
  }
  const invalidDate = message.match(/^invalid date "(.+)"$/);
  if (invalidDate) {
    return `日期无效：${invalidDate[1]}`;
  }
  return message;
}

export default App;
