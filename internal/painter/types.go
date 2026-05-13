package painter

type PaintCell struct {
	Date  string `json:"date"`
	Level int    `json:"level"`
}

type RunRequest struct {
	Token       string      `json:"token"`
	Username    string      `json:"username"`
	Repo        string      `json:"repo"`
	Branch      string      `json:"branch"`
	AuthorName  string      `json:"authorName"`
	AuthorEmail string      `json:"authorEmail"`
	PublicRepo  bool        `json:"publicRepo"`
	Year        int         `json:"year"`
	Cells       []PaintCell `json:"cells"`
}

type RunResult struct {
	RepoURL     string `json:"repoUrl"`
	ProfileURL  string `json:"profileUrl"`
	CommitCount int    `json:"commitCount"`
	DaysPainted int    `json:"daysPainted"`
	CreatedRepo bool   `json:"createdRepo"`
	Branch      string `json:"branch"`
}

type AccountInfo struct {
	Login       string `json:"login"`
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	HTMLURL     string `json:"htmlUrl"`
	NoreplyMail string `json:"noreplyMail"`
}

type ProgressEvent struct {
	Step      string `json:"step"`
	Message   string `json:"message"`
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
	Level     string `json:"level"`
}
