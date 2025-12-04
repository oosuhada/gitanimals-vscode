# GitAnimals for VS Code

GitAnimals for VS Code is a small independent extension that keeps your GitAnimals farm and contribution line close to your editor.

The default GitHub username is `oosuhada`.

VS Code does not expose an official API for arbitrary HTML overlays on top of an existing text editor. Like visual companion extensions, this extension uses an Explorer webview view and positions GitAnimals at the bottom-left inside that view without opening a new editor tab.

## 한국어 요약

GitAnimals for VS Code는 GitHub 기여 기록을 캐릭터/농장 형태로 보여주는 GitAnimals 이미지를 **VS Code Explorer 안에서 바로 확인할 수 있게 만든 작은 확장 프로그램**입니다.

- 새 editor tab을 열지 않고 Explorer webview에서 Farm/Line 이미지를 표시합니다.
- Status Bar와 Command Palette에서 보기 방식, 새로고침, 숨김/표시, 설정을 제어합니다.
- username, image scale, contribution label, 자동 새로고침 주기를 설정할 수 있습니다.
- Dark/Light 실제 동작 화면을 아래 스크린샷으로 확인할 수 있습니다.

VS Code가 기존 editor 위 임의 HTML overlay를 공식 지원하지 않기 때문에, 구현은 지원되는 Explorer webview API 범위 안에서 동작하도록 설계했습니다.

## Screenshots

### Dark Theme

![GitAnimals for VS Code in dark theme](assets/screenshots/dark-mode.png)

### Light Theme

![GitAnimals for VS Code in light theme](assets/screenshots/light-mode.png)

## Usage

1. Press `F5` to launch the Extension Development Host.
2. Click `🐾 GitAnimals` in the Status Bar to choose Farm or Line, refresh, hide, show, or open settings.
3. Run `GitAnimals: Open Full View` from the Command Palette for a larger farm view.
4. The Explorer view renders only the selected GitAnimals image without in-view controls.

The Explorer view height is controlled by VS Code, so the extension cannot force a larger initial section height. The image is clamped to the available view height to keep the username and contribution text visible even when the section opens in a small space.

## Settings

```jsonc
{
  "gitanimals.username": "oosuhada",
  "gitanimals.viewMode": "farm",
  "gitanimals.usernameScale": 0.62,
  "gitanimals.showUsername": true,
  "gitanimals.showContributions": true,
  "gitanimals.imageScaleMode": "fill-width",
  "gitanimals.autoRefreshIntervalMinutes": 10
}
```

- `gitanimals.viewMode`: choose `farm` or `line`.
- `gitanimals.usernameScale`: make the visible farm username smaller or larger.
- `gitanimals.showUsername`: hide or show the farm username label.
- `gitanimals.showContributions`: hide or show the farm total contributions label.
- `gitanimals.imageScaleMode`: choose `fill-width`, `fit`, or `fixed`.

## Local Packaging

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension gitanimals-vscode-0.0.1.vsix
```
