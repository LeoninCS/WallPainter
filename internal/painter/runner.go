package painter

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
	gitconfig "github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
)

type Runner struct {
	progress func(ProgressEvent)
}

type dayCommit struct {
	date  time.Time
	level int
	count int
}

func NewRunner(progress func(ProgressEvent)) *Runner {
	return &Runner{progress: progress}
}

func (r *Runner) Run(ctx context.Context, req RunRequest) (RunResult, error) {
	if err := ctx.Err(); err != nil {
		return RunResult{}, err
	}

	req.normalize()
	if err := req.validate(); err != nil {
		return RunResult{}, err
	}

	r.emit("account", "Resolving GitHub account", 0, 0, "info")
	account, err := ResolveAccount(ctx, req.Token)
	if err != nil {
		return RunResult{}, err
	}
	if req.Username == "" {
		req.Username = account.Login
	}
	if req.AuthorName == "" {
		req.AuthorName = account.Name
	}
	if req.AuthorEmail == "" {
		req.AuthorEmail = account.NoreplyMail
	}

	plan, totalCommits, err := buildCommitPlan(req)
	if err != nil {
		return RunResult{}, err
	}

	r.emit("repo", "Checking target repository", 0, totalCommits, "info")
	createdRepo, err := ensureRepository(ctx, req.Token, req.Username, req.Repo, req.PublicRepo)
	if err != nil {
		return RunResult{}, err
	}
	if createdRepo {
		r.emit("repo", "Created target repository", 0, totalCommits, "success")
	}

	workdir, err := os.MkdirTemp("", "wallpainter-*")
	if err != nil {
		return RunResult{}, err
	}
	defer os.RemoveAll(workdir)

	remoteURL := fmt.Sprintf("https://github.com/%s/%s.git", req.Username, req.Repo)
	auth := &http.BasicAuth{Username: req.Username, Password: req.Token}

	r.emit("clone", "Preparing local repository", 0, totalCommits, "info")
	repo, err := cloneOrInit(workdir, remoteURL, req.Branch, auth)
	if err != nil {
		return RunResult{}, err
	}

	wt, err := repo.Worktree()
	if err != nil {
		return RunResult{}, err
	}

	logPath := filepath.Join(workdir, "wallpainter-log.txt")
	if _, err := os.Stat(logPath); os.IsNotExist(err) {
		if err := os.WriteFile(logPath, []byte("WallPainter contribution log\n"), 0o644); err != nil {
			return RunResult{}, err
		}
	}

	completed := 0
	for _, day := range plan {
		for i := 1; i <= day.count; i++ {
			if err := ctx.Err(); err != nil {
				return RunResult{}, err
			}

			line := fmt.Sprintf("%s level=%d commit=%d/%d\n", day.date.Format("2006-01-02"), day.level, i, day.count)
			f, err := os.OpenFile(logPath, os.O_APPEND|os.O_WRONLY, 0o644)
			if err != nil {
				return RunResult{}, err
			}
			if _, err := f.WriteString(line); err != nil {
				_ = f.Close()
				return RunResult{}, err
			}
			if err := f.Close(); err != nil {
				return RunResult{}, err
			}

			if _, err := wt.Add("wallpainter-log.txt"); err != nil {
				return RunResult{}, err
			}

			when := time.Date(day.date.Year(), day.date.Month(), day.date.Day(), 12, i%60, 0, 0, time.UTC)
			signature := &object.Signature{
				Name:  req.AuthorName,
				Email: req.AuthorEmail,
				When:  when,
			}
			message := fmt.Sprintf("paint: %s %02d", day.date.Format("2006-01-02"), i)
			if _, err := wt.Commit(message, &git.CommitOptions{
				Author:    signature,
				Committer: signature,
			}); err != nil {
				return RunResult{}, err
			}

			completed++
			r.emit("commit", fmt.Sprintf("Generated %s commit %d/%d", day.date.Format("2006-01-02"), i, day.count), completed, totalCommits, "info")
		}
	}

	r.emit("push", "Pushing commits to GitHub", completed, totalCommits, "info")
	if err := repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
		RefSpecs: []gitconfig.RefSpec{
			gitconfig.RefSpec(fmt.Sprintf("refs/heads/%s:refs/heads/%s", req.Branch, req.Branch)),
		},
	}); err != nil && err != git.NoErrAlreadyUpToDate {
		return RunResult{}, err
	}

	r.emit("done", "Finished painting contribution graph", totalCommits, totalCommits, "success")
	return RunResult{
		RepoURL:     fmt.Sprintf("https://github.com/%s/%s", req.Username, req.Repo),
		ProfileURL:  fmt.Sprintf("https://github.com/%s", req.Username),
		CommitCount: totalCommits,
		DaysPainted: len(plan),
		CreatedRepo: createdRepo,
		Branch:      req.Branch,
	}, nil
}

func (r *Runner) emit(step string, message string, completed int, total int, level string) {
	if r.progress == nil {
		return
	}
	r.progress(ProgressEvent{
		Step:      step,
		Message:   message,
		Completed: completed,
		Total:     total,
		Level:     level,
	})
}

func cloneOrInit(workdir string, remoteURL string, branch string, auth *http.BasicAuth) (*git.Repository, error) {
	ref := plumbing.NewBranchReferenceName(branch)
	repo, err := git.PlainClone(workdir, false, &git.CloneOptions{
		URL:           remoteURL,
		Auth:          auth,
		ReferenceName: ref,
		SingleBranch:  true,
	})
	if err == nil {
		return repo, nil
	}

	repo, initErr := git.PlainInit(workdir, false)
	if initErr != nil {
		return nil, fmt.Errorf("clone failed: %w; init failed: %v", err, initErr)
	}
	if err := repo.Storer.SetReference(plumbing.NewSymbolicReference(plumbing.HEAD, ref)); err != nil {
		return nil, err
	}
	if _, err := repo.CreateRemote(&gitconfig.RemoteConfig{
		Name: "origin",
		URLs: []string{remoteURL},
	}); err != nil {
		return nil, err
	}
	return repo, nil
}

func buildCommitPlan(req RunRequest) ([]dayCommit, int, error) {
	byDate := map[string]int{}
	for _, cell := range req.Cells {
		if cell.Level <= 0 {
			continue
		}
		if cell.Level > 4 {
			return nil, 0, fmt.Errorf("invalid level for %s", cell.Date)
		}
		byDate[cell.Date] = cell.Level
	}

	dates := make([]string, 0, len(byDate))
	for date := range byDate {
		dates = append(dates, date)
	}
	sort.Strings(dates)

	plan := make([]dayCommit, 0, len(dates))
	total := 0
	for _, dateText := range dates {
		date, err := time.Parse("2006-01-02", dateText)
		if err != nil {
			return nil, 0, fmt.Errorf("invalid date %q", dateText)
		}
		if date.Year() != req.Year {
			return nil, 0, fmt.Errorf("date %s is outside selected year %d", dateText, req.Year)
		}
		level := byDate[dateText]
		count := commitCountForLevel(level)
		total += count
		plan = append(plan, dayCommit{
			date:  date,
			level: level,
			count: count,
		})
	}
	if total == 0 {
		return nil, 0, fmt.Errorf("paint at least one day before running")
	}
	return plan, total, nil
}

func commitCountForLevel(level int) int {
	switch level {
	case 1:
		return 1
	case 2:
		return 3
	case 3:
		return 6
	case 4:
		return 10
	default:
		return 0
	}
}

func (r *RunRequest) normalize() {
	r.Token = strings.TrimSpace(r.Token)
	r.Username = strings.TrimSpace(r.Username)
	r.Repo = strings.TrimSpace(r.Repo)
	r.Branch = strings.TrimSpace(r.Branch)
	r.AuthorName = strings.TrimSpace(r.AuthorName)
	r.AuthorEmail = strings.TrimSpace(r.AuthorEmail)
	if r.Repo == "" {
		r.Repo = "wallpainter-art"
	}
	if r.Branch == "" {
		r.Branch = "main"
	}
}

func (r RunRequest) validate() error {
	if r.Token == "" {
		return fmt.Errorf("GitHub token is required")
	}
	if r.Year < 2008 || r.Year > time.Now().UTC().Year() {
		return fmt.Errorf("year must be between 2008 and %d", time.Now().UTC().Year())
	}
	if strings.Contains(r.Repo, "/") {
		return fmt.Errorf("repo must be a repository name, for example wallpainter-art")
	}
	if r.Branch == "" {
		return fmt.Errorf("branch is required")
	}
	return nil
}
