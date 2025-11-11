// Main application logic
function initApp() {
  // Initialize all modules
  // (viewer, export wizard, and settings are initialized in their own files)
  
  // Handle document loading
  if (window.electronAPI) {
    window.electronAPI.onLoadDocument((data) => {
      loadDocument(data);
    });
  }
  
  // Handle file open button
  const openFileBtn = document.getElementById('open-file-btn');
  if (openFileBtn && window.electronAPI) {
    openFileBtn.addEventListener('click', async () => {
      const filePath = await window.electronAPI.selectFile();
      if (filePath) {
        showLoading('Opening document...');
        try {
          const result = await window.electronAPI.openDocf(filePath);
          if (!result.success) {
            showError(result.error || 'Failed to open document');
          }
        } catch (err) {
          showError(err.message || 'Failed to open document');
        } finally {
          hideLoading();
        }
      }
    });
  }
  
  // Handle drag and drop
  setupDragAndDrop();
  
  // Handle close document button
  const closeDocBtn = document.getElementById('close-doc-btn');
  if (closeDocBtn) {
    closeDocBtn.addEventListener('click', () => {
      closeDocument();
    });
  }
  
  // Apply initial settings
  setTimeout(() => {
    if (window.viewer) {
      // Settings will be applied by settings.js
    }
  }, 100);
}

function loadDocument(data) {
  console.log('[APP] loadDocument called with data:', data);
  console.log('[APP] window.viewer available:', typeof window.viewer !== 'undefined');
  
  const welcomeScreen = document.getElementById('welcome-screen');
  const viewerScreen = document.getElementById('viewer-screen');
  const exportScreen = document.getElementById('export-screen');
  const closeDocBtn = document.getElementById('close-doc-btn');
  
  // Hide other screens
  welcomeScreen.classList.remove('active');
  exportScreen.classList.remove('active');
  
  // Show viewer
  viewerScreen.classList.add('active');
  
  // Show close document button
  if (closeDocBtn) {
    closeDocBtn.style.display = 'inline-flex';
  }
  
  // Update window title
  if (data.manifest && data.manifest.title) {
    document.title = `${data.manifest.title} - Docufier`;
  }
  
  // Store current document data
  window.currentDocument = data;
  
  // Wait for viewer to be available
  waitForViewer(() => {
    // Convert file:// path to proper format
    const docsPath = data.docsPath.replace(/\\/g, '/');
    console.log('[APP] Initializing viewer with docsPath:', docsPath);
    console.log('[APP] Manifest:', data.manifest);
    window.viewer.init(docsPath, data.manifest);
  }, data);
}

function closeDocument() {
  console.log('[APP] Closing document...');
  
  const welcomeScreen = document.getElementById('welcome-screen');
  const viewerScreen = document.getElementById('viewer-screen');
  const closeDocBtn = document.getElementById('close-doc-btn');
  
  // Hide viewer
  viewerScreen.classList.remove('active');
  
  // Show welcome screen
  welcomeScreen.classList.add('active');
  
  // Hide close document button
  if (closeDocBtn) {
    closeDocBtn.style.display = 'none';
  }
  
  // Reset window title
  document.title = 'Docufier';
  
  // Clear current document
  window.currentDocument = null;
  
  // Clear viewer content
  const container = document.getElementById('docsify-container');
  if (container) {
    container.innerHTML = '';
  }
  
  // Clear sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML = '';
  }
  
  // Cleanup temp directory via IPC
  if (window.electronAPI && window.electronAPI.closeDocument) {
    window.electronAPI.closeDocument().catch(err => {
      console.error('[APP] Error closing document:', err);
    });
  }
}

function waitForViewer(callback, data, maxAttempts = 50, attempt = 0) {
  console.log(`[APP] Checking for viewer (attempt ${attempt + 1}/${maxAttempts})...`);
  console.log(`[APP] window.viewer exists:`, typeof window !== 'undefined' && typeof window.viewer !== 'undefined');
  console.log(`[APP] window object:`, typeof window);
  console.log(`[APP] All window properties:`, typeof window !== 'undefined' ? Object.keys(window).filter(k => k.includes('viewer') || k.includes('Viewer')).join(', ') : 'window undefined');
  
  if (window.viewer && window.viewer.init) {
    console.log('[APP] Viewer found!');
    callback();
    return;
  }
  
  if (attempt >= maxAttempts - 1) {
    console.error('[APP] Viewer not available after waiting');
    console.error('[APP] Attempting fallback: loading file directly...');
    
    // Fallback: try to load the file directly without viewer
    const container = document.getElementById('docsify-container');
    if (container && data.docsPath && data.manifest) {
      // Build sidebar first
      buildSidebarForFallback(data.docsPath, data.manifest);
      // Then load the file
      loadFileDirectly(data.docsPath, data.manifest.entryFile || 'README.md', container);
    } else {
      // Show error message
      if (container) {
        container.innerHTML = `
          <div style="padding: 40px; text-align: center;">
            <h2>Error Loading Document</h2>
            <p>Viewer not initialized. Please refresh the app.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Docs Path: ${data.docsPath || 'N/A'}</p>
            <p style="color: #666; font-size: 12px;">If this persists, check the browser console for errors.</p>
          </div>
        `;
      }
    }
    return;
  }
  
  setTimeout(() => waitForViewer(callback, data, maxAttempts, attempt + 1), 100);
}

// Fallback function to load file directly
async function loadFileDirectly(docsPath, fileName, container) {
  console.log('[APP] Loading file directly as fallback:', fileName);
  try {
    const filePath = `${docsPath}/${fileName}`.replace(/\/+/g, '/');
    console.log('[APP] Full file path:', filePath);
    
    let content = '';
    
    // Try IPC first
    if (window.electronAPI && window.electronAPI.readFile) {
      try {
        const result = await window.electronAPI.readFile(filePath);
        if (result && result.success) {
          content = result.content;
          console.log('[APP] File loaded via IPC, length:', content.length);
        }
      } catch (ipcErr) {
        console.error('[APP] IPC read error:', ipcErr);
      }
    }
    
    // Fallback to fetch
    if (!content) {
      try {
        const response = await fetch(`file://${filePath}`);
        if (response.ok) {
          content = await response.text();
          console.log('[APP] File loaded via fetch, length:', content.length);
        }
      } catch (fetchErr) {
        console.error('[APP] Fetch error:', fetchErr);
      }
    }
    
    if (content) {
      // Render markdown as HTML
      renderMarkdown(content, container);
    } else {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h2>Unable to Load Content</h2>
          <p>Could not read file: ${fileName}</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">Path: ${filePath}</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('[APP] Error loading file directly:', err);
    const container = document.getElementById('docsify-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h2>Error Loading File</h2>
          <p>${err.message}</p>
        </div>
      `;
    }
  }
}

// Render markdown as HTML using marked.js
function renderMarkdown(markdown, container) {
  // Load marked.js from CDN if not available
  if (typeof marked === 'undefined') {
    console.log('[APP] Loading marked.js from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked@latest/marked.min.js';
    script.onload = () => {
      console.log('[APP] marked.js loaded, rendering markdown...');
      renderMarkdownContent(markdown, container);
    };
    script.onerror = () => {
      console.error('[APP] Failed to load marked.js, showing plain text');
      container.innerHTML = `
        <div style="padding: 40px; max-width: 900px; margin: 0 auto; color: var(--text-primary);">
          <pre style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; background: transparent; border: none; padding: 0; margin: 0;">${escapeHtml(markdown)}</pre>
        </div>
      `;
    };
    document.head.appendChild(script);
  } else {
    renderMarkdownContent(markdown, container);
  }
}

function renderMarkdownContent(markdown, container) {
  try {
    // Configure marked options
    if (marked.setOptions) {
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false
      });
    }
    
    // Render markdown to HTML
    let html = marked.parse(markdown);
    
    // Process Mermaid code blocks: convert ```mermaid blocks to <div class="mermaid">
    html = html.replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi,
      (match, content) => {
        return `<div class="mermaid">${content.trim()}</div>`;
      }
    );
    
    // Also handle cases where marked might not add language class
    html = html.replace(
      /<pre><code>([\s\S]*?)<\/code><\/pre>/gi,
      (match, content) => {
        // Check if content looks like mermaid (starts with graph, flowchart, sequenceDiagram, etc.)
        const trimmed = content.trim();
        if (trimmed.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|requirement)/i)) {
          return `<div class="mermaid">${trimmed}</div>`;
        }
        return match;
      }
    );
    
    // Apply Docsify-like styling
    container.innerHTML = `
      <div class="markdown-body" style="
        padding: 40px;
        max-width: 900px;
        margin: 0 auto;
        color: var(--text-primary);
        line-height: 1.6;
        font-size: 16px;
      ">
        ${html}
      </div>
    `;
    
    // Initialize Mermaid if there are any mermaid diagrams
    if (container.querySelector('.mermaid')) {
      initializeMermaid(container);
    }
    
    // Add basic markdown styling
    if (!document.querySelector('#markdown-styles')) {
      const style = document.createElement('style');
      style.id = 'markdown-styles';
      style.textContent = `
        .markdown-body h1 {
          font-size: 2em;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.3em;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .markdown-body h2 {
          font-size: 1.5em;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.3em;
          margin-top: 24px;
          margin-bottom: 16px;
        }
        .markdown-body h3 {
          font-size: 1.25em;
          margin-top: 24px;
          margin-bottom: 16px;
        }
        .markdown-body p {
          margin-bottom: 16px;
        }
        .markdown-body ul, .markdown-body ol {
          margin-bottom: 16px;
          padding-left: 2em;
        }
        .markdown-body li {
          margin-bottom: 0.25em;
        }
        .markdown-body table {
          border-collapse: collapse;
          margin-bottom: 16px;
          width: 100%;
        }
        .markdown-body table th,
        .markdown-body table td {
          border: 1px solid var(--border-color);
          padding: 6px 13px;
        }
        .markdown-body table th {
          background-color: var(--bg-secondary);
          font-weight: 600;
        }
        .markdown-body code {
          background-color: var(--bg-secondary);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
        }
        .markdown-body pre {
          background-color: var(--bg-secondary);
          padding: 16px;
          border-radius: 6px;
          overflow-x: auto;
          margin-bottom: 16px;
        }
        .markdown-body pre code {
          background-color: transparent;
          padding: 0;
        }
        .markdown-body blockquote {
          border-left: 4px solid var(--accent-color);
          padding-left: 16px;
          margin: 16px 0;
          color: var(--text-secondary);
        }
        .markdown-body a {
          color: var(--accent-color);
          text-decoration: none;
        }
        .markdown-body a:hover {
          text-decoration: underline;
        }
        .markdown-body hr {
          border: none;
          border-top: 1px solid var(--border-color);
          margin: 24px 0;
        }
        .markdown-body strong {
          font-weight: 600;
        }
        .markdown-body em {
          font-style: italic;
        }
        .markdown-body .mermaid {
          text-align: center;
          margin: 24px 0;
          padding: 20px;
          background-color: var(--bg-secondary);
          border-radius: 8px;
          overflow-x: auto;
        }
        .markdown-body .mermaid svg {
          max-width: 100%;
          height: auto;
        }
      `;
      document.head.appendChild(style);
    }
    
    console.log('[APP] Markdown rendered successfully');
  } catch (err) {
    console.error('[APP] Error rendering markdown:', err);
    container.innerHTML = `
      <div style="padding: 40px; max-width: 900px; margin: 0 auto; color: var(--text-primary);">
        <pre style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; background: transparent; border: none; padding: 0; margin: 0;">${escapeHtml(markdown)}</pre>
      </div>
    `;
  }
}

// Initialize Mermaid diagrams
function initializeMermaid(container) {
  console.log('[APP] Initializing Mermaid...');
  
  if (typeof mermaid !== 'undefined') {
    console.log('[APP] Mermaid already loaded, initializing...');
    try {
      const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
      
      // Check if using new API (v10+) or old API
      if (typeof mermaid.initialize === 'function') {
        mermaid.initialize({ 
          startOnLoad: false,
          theme: theme,
          securityLevel: 'loose'
        });
      }
      
      const mermaidElements = container.querySelectorAll('.mermaid');
      console.log('[APP] Found', mermaidElements.length, 'Mermaid diagrams');
      
      mermaidElements.forEach((element, index) => {
        const id = `mermaid-${Date.now()}-${index}`;
        element.id = id;
        
        // Try new API first (v10+)
        if (typeof mermaid.run === 'function') {
          mermaid.run({
            nodes: [element]
          }).catch(err => {
            console.error('[APP] Error rendering Mermaid diagram:', err);
            element.innerHTML = `<p style="color: var(--error-color);">Error rendering diagram: ${err.message}</p>`;
          });
        } else if (typeof mermaid.init === 'function') {
          // Fallback to old API (v9 and below)
          mermaid.init(undefined, element);
        } else {
          console.error('[APP] Mermaid API not recognized');
          element.innerHTML = '<p style="color: var(--error-color);">Mermaid renderer not available</p>';
        }
      });
    } catch (err) {
      console.error('[APP] Error initializing Mermaid:', err);
    }
  } else {
    console.log('[APP] Loading Mermaid from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@latest/dist/mermaid.min.js';
    script.onload = () => {
      console.log('[APP] Mermaid loaded, initializing...');
      initializeMermaid(container);
    };
    script.onerror = () => {
      console.error('[APP] Failed to load Mermaid');
      const mermaidElements = container.querySelectorAll('.mermaid');
      mermaidElements.forEach(element => {
        element.innerHTML = '<p style="color: var(--error-color);">Failed to load Mermaid diagram renderer</p>';
      });
    };
    document.head.appendChild(script);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Build sidebar for fallback mode
async function buildSidebarForFallback(docsPath, manifest) {
  console.log('[APP] Building sidebar for fallback mode...');
  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) {
    console.error('[APP] Sidebar element not found');
    return;
  }

  // Try to load _sidebar.md first
  try {
    const sidebarPath = `${docsPath}/_sidebar.md`.replace(/\\/g, '/');
    if (window.electronAPI && window.electronAPI.readFile) {
      const result = await window.electronAPI.readFile(sidebarPath);
      if (result && result.success) {
        renderSidebarFromMarkdown(sidebarEl, result.content, docsPath);
        return;
      }
    }
  } catch (err) {
    console.log('[APP] No _sidebar.md found, generating from structure');
  }

  // Generate sidebar by scanning directory
  await generateSidebarFromFiles(sidebarEl, docsPath, manifest);
}

function renderSidebarFromMarkdown(sidebarEl, content, docsPath) {
  const lines = content.split('\n');
  const ul = document.createElement('ul');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    // Parse markdown links: [text](path)
    const linkMatch = trimmed.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = linkMatch[1];
      a.onclick = (e) => {
        e.preventDefault();
        const filePath = linkMatch[2];
        loadFileFromSidebar(docsPath, filePath);
      };
      li.appendChild(a);
      ul.appendChild(li);
    }
  });
  
  sidebarEl.innerHTML = '<h3>Navigation</h3>';
  sidebarEl.appendChild(ul);
}

async function generateSidebarFromFiles(sidebarEl, docsPath, manifest) {
  console.log('[APP] Generating sidebar from files...');
  const ul = document.createElement('ul');
  
  // Add entry file first
  const entryLi = document.createElement('li');
  const entryLink = document.createElement('a');
  entryLink.href = '#';
  entryLink.textContent = manifest.title || 'Home';
  entryLink.classList.add('active');
  entryLink.onclick = (e) => {
    e.preventDefault();
    loadFileFromSidebar(docsPath, manifest.entryFile || 'README.md');
  };
  entryLi.appendChild(entryLink);
  ul.appendChild(entryLi);
  
  // Try to get list of files via IPC
  if (window.electronAPI && window.electronAPI.listFiles) {
    try {
      const result = await window.electronAPI.listFiles(docsPath);
      if (result && result.success && result.files) {
        result.files
          .filter(file => file.endsWith('.md') || file.endsWith('.markdown'))
          .sort()
          .forEach(file => {
            if (file !== manifest.entryFile) {
              const li = document.createElement('li');
              const a = document.createElement('a');
              a.href = '#';
              a.textContent = file.replace(/\.(md|markdown)$/i, '').replace(/-/g, ' ');
              a.onclick = (e) => {
                e.preventDefault();
                loadFileFromSidebar(docsPath, file);
                // Update active state
                document.querySelectorAll('.sidebar a').forEach(link => link.classList.remove('active'));
                a.classList.add('active');
              };
              li.appendChild(a);
              ul.appendChild(li);
            }
          });
      }
    } catch (err) {
      console.error('[APP] Error listing files:', err);
    }
  }
  
  sidebarEl.innerHTML = '<h3>Navigation</h3>';
  sidebarEl.appendChild(ul);
  
  // Show sidebar even if empty
  if (ul.children.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.textContent = 'No files found';
    emptyLi.style.color = 'var(--text-secondary)';
    emptyLi.style.padding = '8px 12px';
    ul.appendChild(emptyLi);
  }
  
  console.log('[APP] Sidebar built with', ul.children.length, 'items');
}

function loadFileFromSidebar(docsPath, fileName) {
  console.log('[APP] Loading file from sidebar:', fileName);
  const container = document.getElementById('docsify-container');
  if (container) {
    loadFileDirectly(docsPath, fileName, container);
    // Update window title if needed
    document.title = `${fileName} - Docufier`;
  }
}

function setupDragAndDrop() {
  const body = document.body;
  
  body.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    body.style.opacity = '0.8';
  });
  
  body.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    body.style.opacity = '1';
  });
  
  body.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    body.style.opacity = '1';
    
    const files = Array.from(e.dataTransfer.files);
    const docfFile = files.find(f => f.name.endsWith('.docf'));
    
    if (docfFile && window.electronAPI) {
      showLoading('Opening document...');
      try {
        // In Electron renderer, dropped files don't expose .path directly
        // For now, prompt user to use the open button
        showError('Please use the "Open .docf File" button to open files. Drag & drop will be improved in a future update.');
      } catch (err) {
        showError(err.message || 'Failed to open document');
      } finally {
        hideLoading();
      }
    }
  });
}

function showLoading(message = 'Loading...') {
  const overlay = document.getElementById('loading-overlay');
  const messageEl = document.getElementById('loading-message');
  if (overlay) {
    overlay.classList.remove('hidden');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

function showError(message) {
  const modal = document.getElementById('error-modal');
  const messageEl = document.getElementById('error-message');
  if (modal && messageEl) {
    messageEl.textContent = message;
    modal.classList.remove('hidden');
  }
}

function showMessage(message) {
  // Simple alert for now - could be replaced with a toast notification
  alert(message);
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    waitForElectronAPI(initApp);
  });
} else {
  waitForElectronAPI(initApp);
}

