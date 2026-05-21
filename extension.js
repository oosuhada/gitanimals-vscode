const vscode = require('vscode');
const https = require('https');

let panel;
let gitanimalsViewProvider;
let statusBarItem;
let refreshTimer;
let extensionContext;

function activate(context) {
  extensionContext = context;
  gitanimalsViewProvider = new GitAnimalsViewProvider(context);

  const showCompanionCommand = vscode.commands.registerCommand('gitanimals.showCompanion', () => {
    gitanimalsViewProvider.show();
  });

  const configureCommand = vscode.commands.registerCommand('gitanimals.configure', () => {
    showStatusBarMenu();
  });

  const setFarmCommand = vscode.commands.registerCommand('gitanimals.setViewModeFarm', () => {
    setViewMode('farm');
  });

  const setLineCommand = vscode.commands.registerCommand('gitanimals.setViewModeLine', () => {
    setViewMode('line');
  });

  const openCommand = vscode.commands.registerCommand('gitanimals.openFarm', () => {
    openFarm(context);
  });

  const refreshCommand = vscode.commands.registerCommand('gitanimals.refresh', () => {
    refreshWebview();
  });

  const minimizeCommand = vscode.commands.registerCommand('gitanimals.minimize', () => {
    gitanimalsViewProvider.minimize();
  });

  const openSettingsCommand = vscode.commands.registerCommand('gitanimals.openSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', '@ext:oosuhada.gitanimals-vscode');
  });

  const configurationWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('gitanimals')) {
      updateStatusBarItem();
      refreshWebview();
      resetAutoRefresh();
    }
  });

  const themeWatcher = vscode.window.onDidChangeActiveColorTheme(() => {
    refreshWebview();
  });

  const windowStateWatcher = vscode.window.onDidChangeWindowState((state) => {
    if (state.focused) {
      setTimeout(() => {
        refreshWebview();
      }, 2500);
    }
  });

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'gitanimals.configure';
  updateStatusBarItem();
  statusBarItem.show();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('gitanimalsView', gitanimalsViewProvider),
    showCompanionCommand,
    configureCommand,
    setFarmCommand,
    setLineCommand,
    openCommand,
    refreshCommand,
    minimizeCommand,
    openSettingsCommand,
    configurationWatcher,
    themeWatcher,
    windowStateWatcher,
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

  renderFullPanel();
}

function refreshWebview() {
  if (panel) {
    renderFullPanel();
  }

  if (gitanimalsViewProvider) {
    gitanimalsViewProvider.refresh();
  }
}

async function renderFullPanel() {
  if (!panel) {
    return;
  }

  panel.webview.html = await getWebviewHtml();
}

function createStatusBarTooltip() {
  const tooltip = new vscode.MarkdownString(undefined, true);
  tooltip.isTrusted = true;
  tooltip.supportHtml = false;
  tooltip.appendMarkdown('**GitAnimals**\n\n');
  tooltip.appendMarkdown('Click to configure GitAnimals view mode, refresh, show, or open settings.\n\n');
  tooltip.appendMarkdown('VS Code does not expose a custom right-click menu for extension status bar items, so this menu opens on click.');
  return tooltip;
}

function updateStatusBarItem() {
  if (!statusBarItem) {
    return;
  }

  const { viewMode } = getConfiguration();
  statusBarItem.text = `🐾 GitAnimals: ${viewMode === 'farm' ? 'Farm' : 'Line'}`;
  statusBarItem.tooltip = createStatusBarTooltip();
}

async function showStatusBarMenu() {
  const { viewMode } = getConfiguration();
  const choice = await vscode.window.showQuickPick(
    [
      {
        label: viewMode === 'farm' ? '$(check) Show Farm' : 'Show Farm',
        description: 'Only render the farm image',
        command: 'gitanimals.setViewModeFarm'
      },
      {
        label: viewMode === 'line' ? '$(check) Show Line' : 'Show Line',
        description: 'Only render the line image',
        command: 'gitanimals.setViewModeLine'
      },
      {
        label: 'Refresh',
        description: 'Reload GitAnimals image',
        command: 'gitanimals.refresh'
      },
      {
        label: 'Show GitAnimals View',
        description: 'Focus the Explorer GitAnimals view',
        command: 'gitanimals.showCompanion'
      },
      {
        label: 'Hide GitAnimals View Content',
        description: 'Minimize the Explorer GitAnimals view content',
        command: 'gitanimals.minimize'
      },
      {
        label: 'Open Extension Settings',
        description: 'Edit GitAnimals settings',
        command: 'gitanimals.openSettings'
      }
    ],
    {
      placeHolder: 'GitAnimals'
    }
  );

  if (choice) {
    await vscode.commands.executeCommand(choice.command);
  }
}

async function setViewMode(viewMode) {
  await vscode.workspace
    .getConfiguration('gitanimals')
    .update('viewMode', viewMode, vscode.ConfigurationTarget.Global);
  updateStatusBarItem();
  refreshWebview();
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

class GitAnimalsViewProvider {
  constructor(context) {
    this.context = context;
    this.view = undefined;
    this.minimized = false;
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: false,
      enableCommandUris: true
    };
    await this.refresh();
  }

  async refresh() {
    if (!this.view) {
      return;
    }

    this.view.webview.html = await getCompanionHtml(this.minimized);
  }

  async show() {
    this.minimized = false;
    await vscode.commands.executeCommand('workbench.view.explorer');
    await vscode.commands.executeCommand('gitanimalsView.focus');
    await this.refresh();
  }

  async minimize() {
    this.minimized = true;
    await this.refresh();
  }
}

function getConfiguration() {
  const config = vscode.workspace.getConfiguration('gitanimals');
  const configuredViewMode = config.get('viewMode', 'farm') || 'farm';
  const viewMode = configuredViewMode === 'line' ? 'line' : 'farm';
  const configuredScaleMode = config.get('imageScaleMode', 'fill-width') || 'fill-width';
  const imageScaleMode = ['fill-width', 'fit', 'fixed'].includes(configuredScaleMode)
    ? configuredScaleMode
    : 'fill-width';

  return {
    username: config.get('username', 'oosuhada') || 'oosuhada',
    viewMode,
    usernameScale: clampNumber(config.get('usernameScale', 0.62), 0.3, 1.5, 0.62),
    showUsername: config.get('showUsername', true) !== false,
    showContributions: config.get('showContributions', true) !== false,
    imageScaleMode,
    autoRefreshIntervalMinutes: Math.max(1, config.get('autoRefreshIntervalMinutes', 10) || 10)
  };
}

function buildImageUrl(kind, username) {
  const url = new URL(`https://render.gitanimals.org/${kind}/${encodeURIComponent(username)}`);
  url.searchParams.set('v', String(Date.now()));
  return url.toString();
}

async function getWebviewHtml() {
  const { username, viewMode, autoRefreshIntervalMinutes } = getConfiguration();
  const safeUsername = escapeHtml(username);
  const cards = [];

  if (viewMode === 'farm') {
    cards.push(await createImageCard('Farm', 'farms', username));
  }

  if (viewMode === 'line') {
    cards.push(await createImageCard('Line', 'lines', username));
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

    .svg-wrap svg {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 6px;
    }

    .placeholder {
      box-sizing: border-box;
      width: 100%;
      padding: 18px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-sideBar-background);
      font-size: 12px;
      line-height: 1.5;
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
      </div>
    </header>

    <section class="grid" aria-label="GitAnimals views">
      ${cards.join('\n      ')}
    </section>
  </main>
</body>
</html>`;
}

async function getCompanionHtml(minimized) {
  const { username, viewMode, imageScaleMode } = getConfiguration();
  const overlayImage = minimized
    ? ''
    : await createOverlayImage(viewMode === 'farm' ? 'farms' : 'lines', username);
  const scaleClass = `scale-${imageScaleMode}`;

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
      height: 100vh;
      min-height: 0;
      position: relative;
      background: transparent;
      overflow: hidden;
    }

    .overlay {
      position: fixed;
      left: 0;
      bottom: 0;
      z-index: 5;
      width: 100%;
    }

    .images {
      display: ${minimized ? 'none' : 'grid'};
    }

    figure {
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .svg-wrap {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      overflow: hidden;
    }

    .svg-wrap svg {
      display: block;
      width: 100%;
      height: auto;
      max-width: 100%;
      max-height: 100%;
      flex: 0 1 auto;
    }

    .placeholder {
      box-sizing: border-box;
      width: 100%;
      padding: 12px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-sideBar-background);
      font-size: 12px;
      line-height: 1.5;
    }

    .scale-fill-width .svg-wrap svg {
      width: min(100%, calc(100vh * 2));
      max-width: 100%;
      max-height: 100%;
    }

    .scale-fit .svg-wrap svg {
      width: min(100%, calc(100vh * 2));
      max-height: 100%;
      object-fit: contain;
    }

    .scale-fixed .svg-wrap svg {
      width: min(600px, 100%, calc(100vh * 2));
      max-width: 100%;
      max-height: 100%;
    }

    @media (max-width: 520px) {
      .overlay {
        left: 0;
        right: 0;
        bottom: 0;
      }
    }
  </style>
</head>
<body>
  <main class="stage ${scaleClass}">
    <section class="overlay" aria-label="GitAnimals overlay">
      <div class="images">
        ${overlayImage}
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function createImageCard(title, kind, username) {
  const safeTitle = escapeHtml(title);
  const markup = await getGitAnimalsMarkup(kind, username, 'full');

  return `<article class="card">
  <div class="card-header">
    <h2 class="card-title">${safeTitle}</h2>
    <span class="badge">Live image</span>
  </div>
  <figure>
    ${markup}
    <figcaption>If the image does not load, check the configured GitHub username or try the refresh command.</figcaption>
  </figure>
</article>`;
}

async function createOverlayImage(kind, username) {
  const markup = await getGitAnimalsMarkup(kind, username, 'overlay');

  return `<figure>
  ${markup}
</figure>`;
}

async function getGitAnimalsMarkup(kind, username, variant) {
  const url = buildImageUrl(kind, username);

  try {
    const svg = await fetchText(url);
    await setCachedSvg(kind, username, svg);
    const themedSvg = transformGitAnimalsSvg(svg, getConfiguration());
    return `<div class="svg-wrap" role="img" aria-label="GitAnimals ${escapeHtml(kind)} image">${themedSvg}</div>`;
  } catch (error) {
    const cachedSvg = getCachedSvg(kind, username);
    if (cachedSvg) {
      const themedSvg = transformGitAnimalsSvg(cachedSvg, getConfiguration());
      return `<div class="svg-wrap" role="img" aria-label="GitAnimals ${escapeHtml(kind)} cached image">${themedSvg}</div>`;
    }

    return createUnavailableMarkup(kind, variant);
  }
}

function getCachedSvg(kind, username) {
  if (!extensionContext) {
    return undefined;
  }

  return extensionContext.globalState.get(getSvgCacheKey(kind, username));
}

async function setCachedSvg(kind, username, svg) {
  if (!extensionContext || typeof svg !== 'string' || !svg.includes('<svg')) {
    return;
  }

  await extensionContext.globalState.update(getSvgCacheKey(kind, username), svg);
}

function getSvgCacheKey(kind, username) {
  return `gitanimals.svg.${kind}.${username}`;
}

function createUnavailableMarkup(kind, variant) {
  const className = variant === 'overlay' ? 'placeholder overlay-placeholder' : 'placeholder';
  return `<div class="${className}" role="status">GitAnimals ${escapeHtml(kind)} image is unavailable. Refresh after the network reconnects.</div>`;
}

function transformGitAnimalsSvg(svg, options) {
  let transformed = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '');

  transformed = transformed.replace(
    /<rect x="0\.5" y="0\.5" width="599" height="299" rx="4\.5" fill="white"\/>/,
    '<rect id="gitanimals-background" x="0" y="0" width="600" height="300" rx="0" />'
  );

  transformed = transformed.replace(
    /<rect x="0\.5" y="0\.5" width="599" height="299" rx="4\.5" stroke="#D9D9D9" fill="none"\/>/g,
    ''
  );

  transformed = transformFarmLabel(
    transformed,
    'username',
    'translate(15, 15)',
    options.usernameScale,
    options.showUsername
  );

  transformed = transformFarmLabel(
    transformed,
    'commit',
    'translate(15, 266)',
    1,
    options.showContributions
  );

  const textOverride = `<style>
    #gitanimals-background {
      fill: var(--vscode-sideBar-background, var(--vscode-editor-background));
    }
    #username path,
    #username rect,
    #commit path,
    #commit rect,
    [id^="username"] path,
    [id^="username"] rect,
    [id^="contributions"] path,
    [id^="contributions"] rect,
    [id^="level-tag"] path,
    [id^="level-tag"] rect,
    [id^="level-wrap"] path,
    [id^="level-wrap"] rect {
      fill: var(--vscode-editor-foreground) !important;
    }
  </style>`;

  return transformed.replace(/<svg\b([^>]*)>/, '<svg$1>' + textOverride);
}

function transformFarmLabel(svg, id, translate, scale, visible) {
  const display = visible ? '' : ' style="display:none;"';
  const transform = visible ? `${translate} scale(${scale})` : translate;
  const pattern = new RegExp(`<g id="${id}" transform="${escapeRegExp(translate)}">`);
  return svg.replace(pattern, `<g id="${id}" transform="${transform}"${display}>`);
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          response.resume();
          reject(new Error(`Request failed with status ${response.statusCode}`));
          return;
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve(body);
        });
      })
      .on('error', reject);
  });
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
