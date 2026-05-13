package main

import (
	"context"

	"wallpainter/internal/config"
	"wallpainter/internal/painter"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx   context.Context
	store *config.Store
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.store = config.NewStore("WallPainter")
}

func (a *App) LoadSettings() (config.Settings, error) {
	return a.store.Load()
}

func (a *App) SaveSettings(settings config.Settings) error {
	return a.store.Save(settings)
}

func (a *App) ResolveAccount(token string) (painter.AccountInfo, error) {
	return painter.ResolveAccount(a.ctx, token)
}

func (a *App) RunPainting(req painter.RunRequest) (painter.RunResult, error) {
	runner := painter.NewRunner(func(event painter.ProgressEvent) {
		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "wallpainter:progress", event)
		}
	})
	return runner.Run(a.ctx, req)
}
