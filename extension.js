const vscode = require('vscode');

let panel;
let companionPanel;
let statusBarItem;
let refreshTimer;

function activate(context) {
  const showCompanionCommand = vscode.commands.registerCommand('gitanimals.showCompanion', () => {
    showCompanion(context);
  });

  const openCommand = vscode.commands.registerCommand('gitanimals.openFarm', () => {
    openFarm(context);
  });

  const refreshCommand = vscode.commands.registerCommand('gitanimals.refresh', () => {
    refreshWebview();
  });

  const minimizeCommand = vscode.commands.registerCommand('gitanimals.minimize', () => {
    if (companionPanel) {
      companionPanel.dispose();
    }
  });

  const openSettingsCommand = vscode.commands.registerCommand('gitanimals.openSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', '@ext:oosuhada.gitanimals-vscode');
  });

  const configurationWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('gitanimals')) {
      refreshWebview();
      resetAutoRefresh();
    }
  });

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '🐾 GitAnimals';
  statusBarItem.tooltip = createStatusBarTooltip();
  statusBarItem.command = 'gitanimals.showCompanion';
  statusBarItem.show();

  context.subscriptions.push(
    showCompanionCommand,
    openCommand,
    refreshCommand,
    minimizeCommand,
    openSettingsCommand,
    configurationWatcher,
    statusBarItem
  );
  resetAutoRefresh();
}

function deactivate() {
  clearAutoRefresh();
}

function openFarm(context) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One);
    refreshWebview();
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'gitanimals',
    'GitAnimals',
    vscode.ViewColumn.One,
    {
      enableScripts: false,
      enableCommandUris: true,
      retainContextWhenHidden: true
    }
  );

  panel.onDidDispose(() => {
    panel = undefined;
  }, null, context.subscriptions);

  refreshWebview();
}

function showCompanion(context) {
  if (companionPanel) {
    companionPanel.reveal(vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : vscode.ViewColumn.Active, true);
    refreshWebview();
    return;
  }

  companionPanel = vscode.window.createWebviewPanel(
    'gitanimalsCompanion',
    'GitAnimals Overlay',
    vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : vscode.ViewColumn.Active,
    {
      enableScripts: false,
      enableCommandUris: true,
      retainContextWhenHidden: true
    }
  );

  companionPanel.onDidDispose(() => {
    companionPanel = undefined;
  }, null, context.subscriptions);

  refreshWebview();
}

function refreshWebview() {
  if (panel) {
    panel.webview.html = getWebviewHtml();
  }

  if (companionPanel) {
    companionPanel.webview.html = getCompanionHtml();
  }
}

function createStatusBarTooltip() {
  const tooltip = new vscode.MarkdownString(undefined, true);
  tooltip.isTrusted = true;
  tooltip.supportHtml = false;
  tooltip.appendMarkdown('**GitAnimals**\n\n');
  tooltip.appendMarkdown('Click to show the GitAnimals overlay panel in the active editor group.\n\n');
  tooltip.appendMarkdown('Commands: `GitAnimals: Show Overlay`, `GitAnimals: Open Full View`, `GitAnimals: Refresh`, `GitAnimals: Minimize`, `GitAnimals: Open Settings`.');
  return tooltip;
}

function resetAutoRefresh() {
  clearAutoRefresh();

  const intervalMinutes = getConfiguration().autoRefreshIntervalMinutes;
  refreshTimer = setInterval(() => {
    refreshWebview();
  }, intervalMinutes * 60 * 1000);
}

function clearAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}

function getConfiguration() {
  const config = vscode.workspace.getConfiguration('gitanimals');
  return {
    username: config.get('username', 'oosuhada') || 'oosuhada',
    viewMode: config.get('viewMode', 'both') || 'both',
    autoRefreshIntervalMinutes: Math.max(1, config.get('autoRefreshIntervalMinutes', 10) || 10)
  };
}

function buildImageUrl(kind, username) {
  const url = new URL(`https://render.gitanimals.org/${kind}/${encodeURIComponent(username)}`);
  url.searchParams.set('v', String(Date.now()));
  return url.toString();
}

function getWebviewHtml() {
  const { username, viewMode, autoRefreshIntervalMinutes } = getConfiguration();
  const safeUsername = escapeHtml(username);
  const cards = [];

  if (viewMode === 'farm' || viewMode === 'both') {
    cards.push(createImageCard('Farm', buildImageUrl('farms', username)));
  }

  if (viewMode === 'line' || viewMode === 'both') {
    cards.push(createImageCard('Line', buildImageUrl('lines', username)));
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://render.gitanimals.org; style-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitAnimals</title>
  <style>
    :root {
      color-scheme: light dark;
    }

    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .page {
      box-sizing: border-box;
      min-height: 100vh;
      padding: 28px;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 22px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 18px;
    }

    .intro {
      max-width: 640px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 28px;
      line-height: 1.2;
      font-weight: 700;
    }

    .username,
    .hint,
    figcaption,
    .fallback {
      color: var(--vscode-descriptionForeground);
    }

    .username {
      font-size: 14px;
    }

    .summary {
      margin-top: 12px;
      max-width: 560px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      line-height: 1.6;
    }

    .hint {
      max-width: 280px;
      text-align: right;
      font-size: 12px;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 14px;
    }

    .action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      border-radius: 4px;
      padding: 0 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
    }

    .action.secondary {
      background: transparent;
      box-shadow: inset 0 0 0 1px var(--vscode-panel-border);
      color: var(--vscode-editor-foreground);
    }

    .action:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
    }

    .card {
      overflow: hidden;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-sideBar-background);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .card-title {
      margin: 0;
      font-size: 15px;
      font-weight: 650;
    }

    .badge {
      border-radius: 999px;
      padding: 3px 9px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      font-size: 11px;
      line-height: 1.4;
    }

    figure {
      margin: 0;
      padding: 16px;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 6px;
      background: var(--vscode-editor-background);
    }

    figcaption {
      margin-top: 10px;
      font-size: 12px;
      line-height: 1.5;
    }

    .fallback {
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.5;
    }

    @media (max-width: 640px) {
      .page {
        padding: 18px;
      }

      .header {
        display: block;
      }

      .hint {
        max-width: none;
        margin-top: 12px;
        text-align: left;
      }

      .actions {
        justify-content: flex-start;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="intro">
        <h1>GitAnimals</h1>
        <div class="username">@${safeUsername}</div>
        <div class="summary">View your GitAnimals farm and contribution line inside VS Code. Status Bar opens the compact companion view; this full view is for a larger look.</div>
      </div>
      <div>
        <div class="hint">Auto refresh runs every ${autoRefreshIntervalMinutes} minute(s). Manual refresh redraws the images with cache busting.</div>
        <nav class="actions" aria-label="GitAnimals actions">
          <a class="action" href="command:gitanimals.refresh" title="Redraw GitAnimals images">Refresh Now</a>
          <a class="action secondary" href="command:gitanimals.openSettings" title="Open GitAnimals settings">Settings</a>
        </nav>
      </div>
    </header>

    <section class="grid" aria-label="GitAnimals views">
      ${cards.join('\n      ')}
    </section>
  </main>
</body>
</html>`;
}

function getCompanionHtml() {
  const { username, viewMode } = getConfiguration();
  const safeUsername = escapeHtml(username);
  const overlayImages = [];

  if (viewMode === 'farm' || viewMode === 'both') {
    overlayImages.push(createOverlayImage('Farm', buildImageUrl('farms', username)));
  }

  if (viewMode === 'line' || viewMode === 'both') {
    overlayImages.push(createOverlayImage('Line', buildImageUrl('lines', username)));
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://render.gitanimals.org; style-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitAnimals Overlay</title>
  <style>
    :root {
      color-scheme: light dark;
    }

    html {
      background: transparent;
    }

    body {
      margin: 0;
      min-height: 100vh;
      overflow: hidden;
      background: transparent;
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .stage {
      box-sizing: border-box;
      min-height: 100vh;
      position: relative;
      background:
        linear-gradient(180deg, transparent 0%, transparent 52%, color-mix(in srgb, var(--vscode-editor-background) 76%, transparent) 100%);
    }

    .overlay {
      position: fixed;
      left: 18px;
      bottom: 18px;
      z-index: 5;
      width: min(520px, calc(100vw - 36px));
      display: grid;
      gap: 10px;
    }

    .images {
      display: grid;
      gap: 12px;
    }

    figure {
      margin: 0;
      display: grid;
      gap: 5px;
    }

    .label {
      width: max-content;
      max-width: 100%;
      border-radius: 4px;
      padding: 3px 7px;
      background: color-mix(in srgb, var(--vscode-editor-background) 82%, transparent);
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      line-height: 1.4;
    }

    img {
      display: block;
      max-width: min(500px, calc(100vw - 36px));
      max-height: 38vh;
      object-fit: contain;
      image-rendering: pixelated;
      filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.34));
    }

    .toolbar {
      width: max-content;
      max-width: 100%;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 999px;
      padding: 6px;
      background: color-mix(in srgb, var(--vscode-editor-background) 88%, transparent);
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.24);
    }

    .title {
      padding: 0 6px 0 8px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      white-space: nowrap;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      border-radius: 999px;
      padding: 0 9px;
      background: transparent;
      color: var(--vscode-editor-foreground);
      text-decoration: none;
      font-size: 12px;
      line-height: 1;
    }

    .button:hover,
    .button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    @media (max-width: 520px) {
      .overlay {
        left: 12px;
        right: 12px;
        bottom: 12px;
        width: auto;
      }

      .title {
        display: none;
      }
    }
  </style>
</head>
<body>
  <main class="stage">
    <section class="overlay" aria-label="GitAnimals overlay">
      <div class="images">
        ${overlayImages.join('\n        ')}
      </div>
      <nav class="toolbar" aria-label="GitAnimals actions">
        <span class="title">@${safeUsername} · ${escapeHtml(viewMode)}</span>
        <a class="button primary" href="command:gitanimals.refresh" title="Refresh">Refresh</a>
        <a class="button" href="command:gitanimals.minimize" title="Minimize">_</a>
        <a class="button" href="command:gitanimals.openFarm" title="Open full view">Open</a>
        <a class="button" href="command:gitanimals.openSettings" title="Settings">Settings</a>
      </nav>
    </section>
  </main>
</body>
</html>`;
}

function createImageCard(title, imageUrl) {
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(imageUrl);

  return `<article class="card">
  <div class="card-header">
    <h2 class="card-title">${safeTitle}</h2>
    <span class="badge">Live image</span>
  </div>
  <figure>
    <img src="${safeUrl}" alt="GitAnimals ${safeTitle} image">
    <figcaption>If the image does not load, check the configured GitHub username or try the refresh command.</figcaption>
  </figure>
</article>`;
}

function createOverlayImage(title, imageUrl) {
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(imageUrl);

  return `<figure>
  <figcaption class="label">${safeTitle}</figcaption>
  <img src="${safeUrl}" alt="GitAnimals ${safeTitle} image">
</figure>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  activate,
  deactivate
};
