// Settings management
let currentSettings = {
  theme: 'system',
  fontSize: 'medium',
  lineSpacing: 'normal'
};

function initSettings() {
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const themeSelect = document.getElementById('theme-select');
  const fontSizeSelect = document.getElementById('font-size-select');
  const lineSpacingSelect = document.getElementById('line-spacing-select');
  
  // Load settings
  loadSettings();
  
  // Toggle settings panel
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.classList.toggle('open');
    });
  }
  
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.classList.remove('open');
    });
  }
  
  // Apply settings changes
  if (themeSelect) {
    themeSelect.value = currentSettings.theme;
    themeSelect.addEventListener('change', (e) => {
      currentSettings.theme = e.target.value;
      applySettings();
      saveSettings();
    });
  }
  
  if (fontSizeSelect) {
    fontSizeSelect.value = currentSettings.fontSize;
    fontSizeSelect.addEventListener('change', (e) => {
      currentSettings.fontSize = e.target.value;
      applySettings();
      saveSettings();
    });
  }
  
  if (lineSpacingSelect) {
    lineSpacingSelect.value = currentSettings.lineSpacing;
    lineSpacingSelect.addEventListener('change', (e) => {
      currentSettings.lineSpacing = e.target.value;
      applySettings();
      saveSettings();
    });
  }
}

async function loadSettings() {
  if (!window.electronAPI) return;
  
  try {
    const settings = await window.electronAPI.getSettings();
    if (settings) {
      currentSettings = { ...currentSettings, ...settings };
      applySettings();
      
      // Update UI
      const themeSelect = document.getElementById('theme-select');
      const fontSizeSelect = document.getElementById('font-size-select');
      const lineSpacingSelect = document.getElementById('line-spacing-select');
      
      if (themeSelect) themeSelect.value = currentSettings.theme;
      if (fontSizeSelect) fontSizeSelect.value = currentSettings.fontSize;
      if (lineSpacingSelect) lineSpacingSelect.value = currentSettings.lineSpacing;
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function saveSettings() {
  if (!window.electronAPI) return;
  
  try {
    await window.electronAPI.saveSettings(currentSettings);
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

function applySettings() {
  // Apply theme
  if (window.viewer && window.viewer.applyTheme) {
    window.viewer.applyTheme(currentSettings.theme);
  } else {
    applyThemeDirect(currentSettings.theme);
  }
  
  // Apply font size
  if (window.viewer && window.viewer.applyFontSize) {
    window.viewer.applyFontSize(currentSettings.fontSize);
  } else {
    document.documentElement.setAttribute('data-font-size', currentSettings.fontSize);
  }
  
  // Apply line spacing
  if (window.viewer && window.viewer.applyLineSpacing) {
    window.viewer.applyLineSpacing(currentSettings.lineSpacing);
  } else {
    document.documentElement.setAttribute('data-line-spacing', currentSettings.lineSpacing);
  }
}

function applyThemeDirect(theme) {
  const html = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  
  html.setAttribute('data-theme', theme);
  
  // Listen for system theme changes
  if (theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  }
}

// Wait for electronAPI to be available
function waitForElectronAPI(callback, maxAttempts = 50) {
  if (window.electronAPI) {
    callback();
    return;
  }
  
  if (maxAttempts <= 0) {
    console.error('electronAPI not available after waiting');
    callback(); // Still call to initialize
    return;
  }
  
  setTimeout(() => waitForElectronAPI(callback, maxAttempts - 1), 100);
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    waitForElectronAPI(initSettings);
  });
} else {
  waitForElectronAPI(initSettings);
}

