# WallPainter

WallPainter is a desktop client for painting a GitHub contribution graph. Pick a year, draw on a GitHub-style grid, then push generated commits to a dedicated repository.

## 中文说明

WallPainter 是一个用于绘制 GitHub 贡献图的桌面客户端。选择年份后，可以在 GitHub 风格的网格上绘制图案，然后把生成的提交推送到指定仓库。

## 使用流程

1. 打开 WallPainter。
2. 粘贴 GitHub token。
3. 点击 **Use token account**。
4. 选择年份并绘制格子。
5. 点击 **Run and push**。

默认仓库名是 `wallpainter-art`。当 token 拥有创建仓库权限时，WallPainter 会自动创建该仓库。也可以先在 GitHub 手动创建 `wallpainter-art`，再让应用把提交推送进去。

## GitHub Token

首次运行建议使用 classic token，并授予：

- `repo`

获取 classic token：

1. 打开 GitHub **Settings**。
2. 进入 **Developer settings**。
3. 进入 **Personal access tokens**。
4. 选择 **Tokens (classic)**。
5. 点击 **Generate new token**，选择 **Generate new token (classic)**。
6. 勾选 `repo`。
7. 生成 token 后复制到 WallPainter。

`repo` 权限允许 WallPainter 自动创建 `wallpainter-art` 仓库、生成 commits，并推送到 GitHub。

更精细的配置方式是先手动创建 `wallpainter-art` 仓库，然后使用 fine-grained token，并授予：

- Repository access: `wallpainter-art`
- Contents: Read and write

如果希望使用 fine-grained token 并让 WallPainter 自动创建仓库，需要授予：

- Repository access: 账号范围
- Administration: Read and write
- Contents: Read and write

最简单稳定的方式是使用 classic token，并勾选 `repo`。

GitHub 统计贡献提交时，提交作者邮箱需要属于该账号，提交需要进入默认分支或 `gh-pages` 分支。应用会根据 token 账号填充 GitHub noreply 邮箱。

## 开发

安装依赖：

```bash
go mod tidy
cd frontend
npm install
npm run build
cd ..
go run github.com/wailsapp/wails/v2/cmd/wails@latest generate module
```

开发运行：

```bash
go run github.com/wailsapp/wails/v2/cmd/wails@latest dev
```

构建桌面应用：

```bash
go run github.com/wailsapp/wails/v2/cmd/wails@latest build
```

## User Flow

1. Open WallPainter.
2. Paste a GitHub token.
3. Click **Use token account**.
4. Pick a year and paint cells.
5. Click **Run and push**.

The default repository is `wallpainter-art`. WallPainter will create it when the token has repository creation permission. A user can also create `wallpainter-art` on GitHub first and let the app push commits into it.

## GitHub Token

For the simplest first run, use a classic token with:

- `repo`

Create a classic token:

1. Open GitHub **Settings**.
2. Go to **Developer settings**.
3. Go to **Personal access tokens**.
4. Select **Tokens (classic)**.
5. Click **Generate new token**, then choose **Generate new token (classic)**.
6. Select `repo`.
7. Generate the token and paste it into WallPainter.

The `repo` scope lets WallPainter create the `wallpainter-art` repository, generate commits, and push them to GitHub.

For a stricter setup, create the `wallpainter-art` repository manually, then use a fine-grained token with:

- Repository access: `wallpainter-art`
- Contents: Read and write

If you want to use a fine-grained token and let WallPainter create the repository, grant:

- Repository access: account scope
- Administration: Read and write
- Contents: Read and write

The simplest reliable setup is a classic token with the `repo` scope.

GitHub only counts commits when the author email belongs to the account and the commits land on the default branch or `gh-pages`. The app fills the GitHub noreply email from the token account.

## Development

Install dependencies:

```bash
go mod tidy
cd frontend
npm install
npm run build
cd ..
go run github.com/wailsapp/wails/v2/cmd/wails@latest generate module
```

Run in development:

```bash
go run github.com/wailsapp/wails/v2/cmd/wails@latest dev
```

Build the desktop app:

```bash
go run github.com/wailsapp/wails/v2/cmd/wails@latest build
```

## Stack

- Wails
- Go
- React
- TypeScript
- Vite
- go-git
