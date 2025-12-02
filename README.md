# GitAnimals for VS Code

GitAnimals for VS Code is a small independent extension that keeps your GitAnimals farm and contribution line close to your editor.

The default GitHub username is `oosuhada`.

## Usage

1. Press `F5` to launch the Extension Development Host.
2. Click `🐾 GitAnimals` in the Status Bar to show the companion view beside your editor.
3. Run `GitAnimals: Open Full View` from the Command Palette for a larger farm view.
4. Use `Refresh`, `Full View`, and `Settings` from the companion view or tab title actions.

## Settings

```jsonc
{
  "gitanimals.username": "oosuhada",
  "gitanimals.viewMode": "both",
  "gitanimals.autoRefreshIntervalMinutes": 10
}
```

## Local Packaging

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension gitanimals-vscode-0.0.1.vsix
```
