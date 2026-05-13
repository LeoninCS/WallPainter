package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

type Settings struct {
	Token         string `json:"token"`
	RememberToken bool   `json:"rememberToken"`
	Username      string `json:"username"`
	Repo          string `json:"repo"`
	Branch        string `json:"branch"`
	AuthorName    string `json:"authorName"`
	AuthorEmail   string `json:"authorEmail"`
	PublicRepo    bool   `json:"publicRepo"`
}

type Store struct {
	appName string
}

func NewStore(appName string) *Store {
	return &Store{appName: appName}
}

func (s *Store) Load() (Settings, error) {
	settings := defaultSettings()
	path, err := s.path()
	if err != nil {
		return settings, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return settings, nil
		}
		return settings, err
	}
	if err := json.Unmarshal(data, &settings); err != nil {
		return defaultSettings(), err
	}
	normalize(&settings)
	return settings, nil
}

func (s *Store) Save(settings Settings) error {
	normalize(&settings)
	if !settings.RememberToken {
		settings.Token = ""
	}

	path, err := s.path()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func (s *Store) path() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, s.appName, "settings.json"), nil
}

func defaultSettings() Settings {
	return Settings{
		Repo:       "wallpainter-art",
		Branch:     "main",
		PublicRepo: true,
	}
}

func normalize(settings *Settings) {
	if settings.Repo == "" {
		settings.Repo = "wallpainter-art"
	}
	if settings.Branch == "" {
		settings.Branch = "main"
	}
}
