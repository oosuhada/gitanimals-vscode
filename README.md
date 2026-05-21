# GitAnimals for VS Code

GitAnimals for VS Code is a small independent extension that keeps your GitAnimals farm and contribution line close to your editor.

The default GitHub username is `oosuhada`.

VS Code does not expose an official API for arbitrary HTML overlays on top of an existing text editor. Like visual companion extensions, this extension uses an Explorer webview view and positions GitAnimals at the bottom-left inside that view without opening a new editor tab.

## Usage

1. Press `F5` to launch the Extension Development Host.
2. Click `🐾 GitAnimals` in the Status Bar to choose Farm or Line, refresh, hide, show, or open settings.
3. Run `GitAnimals: Open Full View` from the Command Palette for a larger farm view.
4. The Explorer view renders only the selected GitAnimals image without in-view controls.

## Settings

```jsonc
{
  "gitanimals.username": "oosuhada",
  "gitanimals.viewMode": "farm",
  "gitanimals.usernameScale": 0.72,
  "gitanimals.showUsername": true,
  "gitanimals.showContributions": true,
  "gitanimals.imageScaleMode": "fill-width",
  "gitanimals.autoRefreshIntervalMinutes": 10
}
```

## Local Packaging

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension gitanimals-vscode-0.0.1.vsix
```
