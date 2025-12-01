const vscode = require('vscode');

let panel;
let statusBarItem;
let refreshTimer;

function activate(context) {
  const openCommand = vscode.commands.registerCommand('gitanimals.openFarm', () => {
    openFarm(context);
  });

  const refreshCommand = vscode.commands.registerCommand('gitanimals.refresh', () => {
    refreshWebview();
  });

  const configurationWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('gitanimals')) {
      refreshWebview();
      resetAutoRefresh();
    }
  });

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '🐾 GitAnimals';
  statusBarItem.tooltip = 'Open GitAnimals';
  statusBarItem.command = 'gitanimals.openFarm';
  statusBarItem.show();

  context.subscriptions.push(openCommand, refreshCommand, configurationWatcher, statusBarItem);
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
      retainContextWhenHidden: true
    }
  );

  panel.onDidDispose(() => {
    panel = undefined;
  }, null, context.subscriptions);

  refreshWebview();
}

function refreshWebview() {
  if (!panel) {
    return;
  }

  panel.webview.html = getWebviewHtml();
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

    .hint {
      max-width: 280px;
      text-align: right;
      font-size: 12px;
      line-height: 1.5;
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
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div>
        <h1>GitAnimals</h1>
        <div class="username">@${safeUsername}</div>
      </div>
      <div class="hint">Use “GitAnimals: Refresh” from the Command Palette to redraw this view. Auto refresh runs every ${autoRefreshIntervalMinutes} minute(s).</div>
    </header>

    <section class="grid" aria-label="GitAnimals views">
      ${cards.join('\n      ')}
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
