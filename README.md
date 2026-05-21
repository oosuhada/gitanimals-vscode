# GitAnimals for VS Code

GitAnimals for VS Code is a small independent extension that opens your GitAnimals farm and contribution line inside a VS Code webview.

The default GitHub username is `oosuhada`.

## Usage

1. Press `F5` to launch the Extension Development Host.
2. Run `GitAnimals: Open Farm` from the Command Palette.
3. Click `🐾 GitAnimals` in the Status Bar.

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
