// Docsify viewer integration
let docsifyInstance = null;
let currentDocsPath = null;
let currentManifest = null;

// Ensure viewer is available immediately - export FIRST before anything else
console.log('[VIEWER] Viewer module loading...');

// Initialize Docsify viewer
function initDocsify(docsPath, manifest) {
  console.log('[VIEWER] initDocsify called');
  console.log('[VIEWER] docsPath:', docsPath);
  console.log('[VIEWER] manifest:', manifest);
  
  currentDocsPath = docsPath;
  currentManifest = manifest;
  
  const container = document.getElementById('docsify-container');
  if (!container) {
    console.error('[VIEWER] docsify-container not found!');
    return;
  }

  console.log('[VIEWER] Container found, clearing and setting up...');

  // Clear previous content
  container.innerHTML = '';

  // Create Docsify mount point
  const mountPoint = document.createElement('div');
  mountPoint.id = 'docsify-app';
  container.appendChild(mountPoint);

  // Load Docsify from CDN (for MVP - can be bundled later for offline)
  if (!window.Docsify) {
    console.log('[VIEWER] Loading Docsify from CDN...');
    loadDocsifyScripts(() => {
      console.log('[VIEWER] Docsify scripts loaded, rendering...');
      renderDocsify(mountPoint, docsPath, manifest);
    });
  } else {
    console.log('[VIEWER] Docsify already loaded, rendering...');
    renderDocsify(mountPoint, docsPath, manifest);
  }
}

// Export viewer IMMEDIATELY - before any other code runs
try {
  window.viewer = {
    init: initDocsify,
    applyTheme: function(theme) {
      const html = document.documentElement;
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
      }
      html.setAttribute('data-theme', theme);
    },
    applyFontSize: function(size) {
      document.documentElement.setAttribute('data-font-size', size);
    },
    applyLineSpacing: function(spacing) {
      document.documentElement.setAttribute('data-line-spacing', spacing);
    }
  };
  
  console.log('[VIEWER] window.viewer exported immediately:', typeof window.viewer !== 'undefined');
  console.log('[VIEWER] window.viewer.init:', typeof window.viewer.init);
} catch (error) {
  console.error('[VIEWER] CRITICAL ERROR exporting viewer:', error);
  console.error('[VIEWER] Error stack:', error.stack);
  // Still try to export a minimal viewer
  window.viewer = {
    init: function(docsPath, manifest) {
      console.error('[VIEWER] initDocsify failed, viewer not functional');
    },
    applyTheme: function() {},
    applyFontSize: function() {},
    applyLineSpacing: function() {}
  };
}

function loadDocsifyScripts(callback) {
  // Load Docsify CSS
  if (!document.querySelector('link[href*="docsify"]')) {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/docsify@latest/lib/themes/vue.css';
    document.head.appendChild(cssLink);
  }

  // Load Docsify core - use latest stable version
  if (!window.Docsify) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/docsify@latest';
    script.onload = () => {
      console.log('[VIEWER] Docsify script loaded, window.Docsify:', typeof window.Docsify);
      // Load plugins
      loadDocsifyPlugins(callback);
    };
    script.onerror = (err) => {
      console.error('[VIEWER] Failed to load Docsify script:', err);
      callback(); // Still call callback to show error
    };
    document.head.appendChild(script);
  } else {
    loadDocsifyPlugins(callback);
  }
}

function loadDocsifyPlugins(callback) {
  let pluginsLoaded = 0;
  const totalPlugins = 2;
  
  const onPluginLoaded = () => {
    pluginsLoaded++;
    if (pluginsLoaded >= totalPlugins) {
      callback();
    }
  };
  
  // Load search plugin
  if (!document.querySelector('script[src*="search.min.js"]')) {
    const searchScript = document.createElement('script');
    searchScript.src = 'https://cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js';
    searchScript.onload = onPluginLoaded;
    searchScript.onerror = onPluginLoaded; // Continue even if it fails
    document.head.appendChild(searchScript);
  } else {
    onPluginLoaded();
  }
  
  // Load Mermaid plugin for Docsify
  if (!document.querySelector('script[src*="mermaid"]')) {
    const mermaidScript = document.createElement('script');
    mermaidScript.src = 'https://cdn.jsdelivr.net/npm/docsify-mermaid@latest/dist/docsify-mermaid.js';
    mermaidScript.onload = onPluginLoaded;
    mermaidScript.onerror = onPluginLoaded; // Continue even if it fails
    document.head.appendChild(mermaidScript);
  } else {
    onPluginLoaded();
  }
}

function renderDocsify(mountPoint, docsPath, manifest) {
  console.log('[VIEWER] renderDocsify called');
  console.log('[VIEWER] mountPoint:', mountPoint);
  console.log('[VIEWER] docsPath:', docsPath);
  
  // Normalize path - remove file:// if present, ensure forward slashes
  let normalizedPath = docsPath.replace(/\\/g, '/');
  if (normalizedPath.startsWith('file://')) {
    normalizedPath = normalizedPath.substring(7);
  }
  
  console.log('[VIEWER] normalizedPath:', normalizedPath);

  // Set up mount point for Docsify - it needs to be the container itself
  // Docsify looks for elements with data-app attribute or the main container
  mountPoint.setAttribute('data-app', '');
  
  // Configure Docsify - must be set BEFORE Docsify script loads
  // But we'll set it here since script might already be loaded
  if (!window.$docsify) {
    window.$docsify = {};
  }
  
  // Merge with our config
  Object.assign(window.$docsify, {
    name: manifest.title || 'Documentation',
    repo: '',
    loadSidebar: true,
    subMaxLevel: 3,
    auto2top: true,
    coverpage: false,
    notFoundPage: true,
    search: {
      maxAge: 86400000,
      paths: 'auto',
      placeholder: 'Search...',
      noData: 'No results found',
      depth: 6
    },
    themeColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#0066cc',
    basePath: normalizedPath,
    // Custom request handler for local files in Electron
    request: {
      requestFn: async function(url) {
        try {
          console.log('[VIEWER] Requesting file:', url);
          // Remove leading slash and convert to file path
          const cleanUrl = url.replace(/^\/+/, '');
          // Ensure normalized path doesn't have trailing slash
          const basePath = normalizedPath.replace(/\/$/, '');
          // Join paths manually (path module not available in renderer)
          const fullPath = `${basePath}/${cleanUrl}`.replace(/\/+/g, '/');
          
          console.log('[VIEWER] Full path:', fullPath);
          
          // Try using IPC to read file (more reliable in Electron)
          if (window.electronAPI && window.electronAPI.readFile) {
            try {
              const result = await window.electronAPI.readFile(fullPath);
              if (result.success) {
                console.log('[VIEWER] File loaded via IPC, length:', result.content.length);
                return result.content;
              } else {
                console.error('[VIEWER] IPC read failed:', result.error);
              }
            } catch (ipcErr) {
              console.error('[VIEWER] IPC error:', ipcErr);
            }
          }
          
          // Fallback to fetch
          const filePath = `file://${fullPath}`;
          console.log('[VIEWER] Trying fetch:', filePath);
          const response = await fetch(filePath);
          if (response.ok) {
            const text = await response.text();
            console.log('[VIEWER] File loaded via fetch, length:', text.length);
            return text;
          } else {
            console.error('[VIEWER] File fetch failed:', response.status, response.statusText);
            return '';
          }
        } catch (err) {
          console.error('[VIEWER] Error loading file:', err);
          return '';
        }
      }
    }
  };

  // Initialize Docsify after a short delay to ensure everything is ready
  setTimeout(() => {
    console.log('[VIEWER] Checking for Docsify...', typeof window.Docsify);
    console.log('[VIEWER] window.$docsify:', window.$docsify);
    
    if (window.Docsify) {
      console.log('[VIEWER] Docsify is available, initializing...');
      
      // Force Docsify to initialize on our mount point
      // Docsify typically auto-initializes, but we need to ensure it targets our element
      try {
        // Set the entry file in hash
        const entryFile = manifest.entryFile || 'README.md';
        console.log('[VIEWER] Setting entry file:', entryFile);
        
        // Make sure mountPoint is visible and ready
        mountPoint.style.minHeight = '400px';
        
        // Trigger Docsify initialization by setting hash
        // Docsify listens to hash changes
        window.location.hash = `#/${entryFile}`;
        
        // Force a re-render by triggering hashchange
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        
        // Also try direct initialization if available
        if (window.Docsify && typeof window.Docsify.init === 'function') {
          console.log('[VIEWER] Calling Docsify.init()...');
          window.Docsify.init();
        }
        
        // Build sidebar
        buildSidebar(docsPath, manifest);
        
        // Check if content loaded after a delay
        setTimeout(() => {
          if (mountPoint.innerHTML.trim() === '' || mountPoint.innerHTML.includes('Loading')) {
            console.warn('[VIEWER] Content still empty, trying alternative approach...');
            // Try loading the file directly and rendering
            loadAndRenderFile(docsPath, entryFile, mountPoint);
          } else {
            console.log('[VIEWER] Content appears to be loaded');
          }
        }, 1000);
        
      } catch (err) {
        console.error('[VIEWER] Error during Docsify init:', err);
        loadAndRenderFile(docsPath, manifest.entryFile || 'README.md', mountPoint);
      }
    } else {
      console.error('[VIEWER] Docsify not available!');
      // Fallback: load and render file directly
      loadAndRenderFile(docsPath, manifest.entryFile || 'README.md', mountPoint);
    }
  }, 800); // Increased delay to ensure Docsify is fully loaded
}

// Fallback function to load and render markdown directly
async function loadAndRenderFile(docsPath, fileName, container) {
  console.log('[VIEWER] Loading file directly:', fileName);
  try {
    const filePath = `${docsPath}/${fileName}`.replace(/\/+/g, '/');
    console.log('[VIEWER] Full file path:', filePath);
    
    let content = '';
    
    // Try IPC first
    if (window.electronAPI && window.electronAPI.readFile) {
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        content = result.content;
      }
    }
    
    // Fallback to fetch
    if (!content) {
      const response = await fetch(`file://${filePath}`);
      if (response.ok) {
        content = await response.text();
      }
    }
    
    if (content) {
      console.log('[VIEWER] File loaded, rendering markdown...');
      // Render markdown as HTML
      renderMarkdownHTML(content, container);
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
    console.error('[VIEWER] Error loading file directly:', err);
    container.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <h2>Error Loading File</h2>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render markdown as HTML using marked.js
function renderMarkdownHTML(markdown, container) {
  // Load marked.js from CDN if not available
  if (typeof marked === 'undefined') {
    console.log('[VIEWER] Loading marked.js from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked@latest/marked.min.js';
    script.onload = () => {
      console.log('[VIEWER] marked.js loaded, rendering markdown...');
      renderMarkdownContent(markdown, container);
    };
    script.onerror = () => {
      console.error('[VIEWER] Failed to load marked.js, showing plain text');
      container.innerHTML = `
        <div style="padding: 40px; max-width: 900px; margin: 0 auto; color: var(--text-primary);">
          <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${escapeHtml(markdown)}</pre>
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
    
    // Add basic markdown styling (only if not already added)
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
    
    console.log('[VIEWER] Markdown rendered successfully');
  } catch (err) {
    console.error('[VIEWER] Error rendering markdown:', err);
    container.innerHTML = `
      <div style="padding: 40px; max-width: 900px; margin: 0 auto; color: var(--text-primary);">
        <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${escapeHtml(markdown)}</pre>
      </div>
    `;
  }
}

// Initialize Mermaid diagrams
function initializeMermaid(container) {
  console.log('[VIEWER] Initializing Mermaid...');
  
  if (typeof mermaid !== 'undefined') {
    console.log('[VIEWER] Mermaid already loaded, initializing...');
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
      console.log('[VIEWER] Found', mermaidElements.length, 'Mermaid diagrams');
      
      mermaidElements.forEach((element, index) => {
        const id = `mermaid-${Date.now()}-${index}`;
        element.id = id;
        
        // Try new API first (v10+)
        if (typeof mermaid.run === 'function') {
          mermaid.run({
            nodes: [element]
          }).catch(err => {
            console.error('[VIEWER] Error rendering Mermaid diagram:', err);
            element.innerHTML = `<p style="color: var(--error-color);">Error rendering diagram: ${err.message}</p>`;
          });
        } else if (typeof mermaid.init === 'function') {
          // Fallback to old API (v9 and below)
          mermaid.init(undefined, element);
        } else {
          console.error('[VIEWER] Mermaid API not recognized');
          element.innerHTML = '<p style="color: var(--error-color);">Mermaid renderer not available</p>';
        }
      });
    } catch (err) {
      console.error('[VIEWER] Error initializing Mermaid:', err);
    }
  } else {
    console.log('[VIEWER] Loading Mermaid from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@latest/dist/mermaid.min.js';
    script.onload = () => {
      console.log('[VIEWER] Mermaid loaded, initializing...');
      initializeMermaid(container);
    };
    script.onerror = () => {
      console.error('[VIEWER] Failed to load Mermaid');
      const mermaidElements = container.querySelectorAll('.mermaid');
      mermaidElements.forEach(element => {
        element.innerHTML = '<p style="color: var(--error-color);">Failed to load Mermaid diagram renderer</p>';
      });
    };
    document.head.appendChild(script);
  }
}

async function buildSidebar(docsPath, manifest) {
  console.log('[VIEWER] buildSidebar called with:', { docsPath, manifest });
  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) {
    console.error('[VIEWER] Sidebar element not found!');
    return;
  }
  console.log('[VIEWER] Sidebar element found, building...');

  // Try to load _sidebar.md first
  try {
    const sidebarPath = `${docsPath}/_sidebar.md`.replace(/\\/g, '/');
    // Try IPC first
    if (window.electronAPI && window.electronAPI.readFile) {
      const result = await window.electronAPI.readFile(sidebarPath);
      if (result && result.success) {
        renderSidebarFromMarkdown(sidebarEl, result.content, docsPath);
        return;
      }
    }
    // Fallback to fetch
    const response = await fetch(`file://${sidebarPath}`);
    if (response.ok) {
      const content = await response.text();
      renderSidebarFromMarkdown(sidebarEl, content, docsPath);
      return;
    }
  } catch (err) {
    console.log('[VIEWER] No _sidebar.md found, generating from structure');
    // Fall through to generate from structure
  }

  // Generate sidebar from folder structure
  generateSidebarFromStructure(sidebarEl, docsPath, manifest);
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
      a.href = `#/${linkMatch[2]}`;
      a.textContent = linkMatch[1];
      li.appendChild(a);
      ul.appendChild(li);
    }
  });
  
  sidebarEl.innerHTML = '';
  sidebarEl.appendChild(ul);
}

async function generateSidebarFromStructure(sidebarEl, docsPath, manifest) {
  console.log('[VIEWER] Generating sidebar from structure...');
  const ul = document.createElement('ul');
  
  // Add entry file first
  const entryLi = document.createElement('li');
  const entryLink = document.createElement('a');
  entryLink.href = `#/${manifest.entryFile}`;
  entryLink.textContent = manifest.title || 'Home';
  entryLink.classList.add('active');
  entryLi.appendChild(entryLink);
  ul.appendChild(entryLi);
  
  // Try to get list of files via IPC
  if (window.electronAPI && window.electronAPI.listFiles) {
    try {
      const result = await window.electronAPI.listFiles(docsPath);
      if (result && result.success && result.files) {
        console.log('[VIEWER] Found files:', result.files);
        result.files
          .filter(file => file.endsWith('.md') || file.endsWith('.markdown'))
          .sort()
          .forEach(file => {
            if (file !== manifest.entryFile && file !== '_sidebar.md') {
              const li = document.createElement('li');
              const a = document.createElement('a');
              a.href = `#/${file}`;
              a.textContent = file.replace(/\.(md|markdown)$/i, '').replace(/-/g, ' ');
              li.appendChild(a);
              ul.appendChild(li);
            }
          });
      }
    } catch (err) {
      console.error('[VIEWER] Error listing files:', err);
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
  
  console.log('[VIEWER] Sidebar built with', ul.children.length, 'items');
  
  // Update active link on navigation
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.closest('.sidebar')) {
      document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
      e.target.classList.add('active');
    }
  });
}

// Update the exported viewer object with the full functions
window.viewer.applyTheme = function(theme) {
  const html = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  html.setAttribute('data-theme', theme);
};

window.viewer.applyFontSize = function(size) {
  document.documentElement.setAttribute('data-font-size', size);
};

window.viewer.applyLineSpacing = function(spacing) {
  document.documentElement.setAttribute('data-line-spacing', spacing);
};

console.log('[VIEWER] window.viewer fully initialized:', typeof window.viewer !== 'undefined');

