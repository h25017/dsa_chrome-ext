/**
 * Design System Analyzer - Popup UI Logic
 * Kezeli a felhasználói interakciókat és megjeleníti az elemzési eredményeket
 */

// DOM Elements
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const resultsContainer = document.getElementById('resultsContainer');
const exportBtn = document.getElementById('exportBtn');

// Section elements
const colorsCount = document.getElementById('colorsCount');
const colorsList = document.getElementById('colorsList');
const colorsEmpty = document.getElementById('colorsEmpty');

const fontFamiliesList = document.getElementById('fontFamiliesList');
const headingsList = document.getElementById('headingsList');
const bodyText = document.getElementById('bodyText');
const typographyEmpty = document.getElementById('typographyEmpty');

const imagesCount = document.getElementById('imagesCount');
const logoContainer = document.getElementById('logoContainer');
const imagesList = document.getElementById('imagesList');
const svgsList = document.getElementById('svgsList');
const backgroundsList = document.getElementById('backgroundsList');
const imagesEmpty = document.getElementById('imagesEmpty');

// WordPress check elements
const wpCheckBtn = document.getElementById('wpCheckBtn');
const wpResult = document.getElementById('wpResult');

// Store analysis data for export
let analysisData = null;

/**
 * Initialize event listeners
 */
function init() {
  analyzeBtn.addEventListener('click', handleAnalyze);
  exportBtn.addEventListener('click', handleExport);
  wpCheckBtn.addEventListener('click', handleWordPressCheck);

  // Section toggle handlers
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.section');
      section.classList.toggle('collapsed');
    });
  });
}

/**
 * Handle analyze button click
 */
async function handleAnalyze() {
  // Show loading state
  analyzeBtn.disabled = true;
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  resultsContainer.classList.add('hidden');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('Nem található aktív tab');
    }

    // Check if we can access the tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Chrome belső oldalakat nem lehet elemezni');
    }

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });

    if (response.error) {
      throw new Error(response.error);
    }

    // Store data for export
    analysisData = response;

    // Render results
    renderResults(response);

    // Show results
    loadingState.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    // Collapse all sections by default
    document.querySelectorAll('.section').forEach(section => {
      section.classList.add('collapsed');
    });

  } catch (error) {
    console.error('Analysis error:', error);
    showError(error.message || 'Hiba történt az elemzés során');
  } finally {
    analyzeBtn.disabled = false;
  }
}

/**
 * Handle WordPress check button click
 */
async function handleWordPressCheck() {
  wpCheckBtn.disabled = true;
  wpCheckBtn.textContent = 'Ellenrzés...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showWpResult(false, 'Nem ellenrizheto');
      return;
    }

    // Execute script to check for WordPress indicators
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectWordPress
    });

    const isWordPress = results[0]?.result || false;
    showWpResult(isWordPress);

  } catch (error) {
    console.error('WordPress check error:', error);
    showWpResult(false, 'Hiba tortent');
  } finally {
    wpCheckBtn.disabled = false;
    wpCheckBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      Ez WordPress oldal?
    `;
  }
}

/**
 * Detect WordPress indicators (runs in page context)
 */
function detectWordPress() {
  const indicators = {
    metaGenerator: false,
    wpContent: false,
    wpIncludes: false,
    wpEmoji: false,
    wpJson: false
  };

  // Check meta generator tag
  const generator = document.querySelector('meta[name="generator"]');
  if (generator && generator.content.toLowerCase().includes('wordpress')) {
    indicators.metaGenerator = true;
  }

  // Check for wp-content or wp-includes in any src/href
  const html = document.documentElement.innerHTML;
  if (html.includes('/wp-content/') || html.includes('/wp-content\\u002F')) {
    indicators.wpContent = true;
  }
  if (html.includes('/wp-includes/') || html.includes('/wp-includes\\u002F')) {
    indicators.wpIncludes = true;
  }

  // Check for wp-emoji
  if (html.includes('wp-emoji') || document.querySelector('script[src*="wp-emoji"]')) {
    indicators.wpEmoji = true;
  }

  // Check for WP REST API link
  const wpApiLink = document.querySelector('link[rel="https://api.w.org/"]');
  if (wpApiLink) {
    indicators.wpJson = true;
  }

  // Return true if at least 2 indicators match (more reliable)
  const matchCount = Object.values(indicators).filter(Boolean).length;
  return matchCount >= 1;
}

/**
 * Show WordPress check result
 */
function showWpResult(isWordPress, customMessage = null) {
  wpResult.classList.remove('hidden', 'is-wordpress', 'not-wordpress');

  if (customMessage) {
    wpResult.textContent = customMessage;
    wpResult.classList.add('not-wordpress');
  } else if (isWordPress) {
    wpResult.innerHTML = '<strong>Igen!</strong> Ez egy WordPress oldal.';
    wpResult.classList.add('is-wordpress');
  } else {
    wpResult.innerHTML = '<strong>Nem.</strong> Ez nem WordPress oldal.';
    wpResult.classList.add('not-wordpress');
  }
}

/**
 * Show error message
 */
function showError(message) {
  loadingState.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorState.querySelector('.error-text').textContent = message;
}

/**
 * Render all analysis results
 */
function renderResults(data) {
  renderColors(data.colors);
  renderTypography(data.typography);
  renderImages(data.images);
}

/**
 * Render colors section
 */
function renderColors(colors) {
  colorsList.innerHTML = '';

  if (!colors || colors.length === 0) {
    colorsEmpty.classList.remove('hidden');
    colorsCount.textContent = '';
    return;
  }

  colorsEmpty.classList.add('hidden');
  colorsCount.textContent = `${colors.length} db`;

  colors.forEach(color => {
    const item = document.createElement('div');
    item.className = 'color-item';
    item.innerHTML = `
      <div class="color-swatch" style="background-color: ${color.hex}"></div>
      <span class="color-hex">${color.hex}</span>
      <span class="color-category">${getCategoryLabel(color.category)}</span>
      <button class="copy-btn" data-copy="${color.hex}" title="Másolás">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    `;
    colorsList.appendChild(item);
  });

  // Add copy handlers
  colorsList.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', handleCopy);
  });
}

/**
 * Get Hungarian label for color category
 */
function getCategoryLabel(category) {
  const labels = {
    'Primary': 'Primary',
    'Accent': 'Accent',
    'Background': 'Background',
    'Foreground': 'Foreground',
    'Border': 'Border'
  };
  return labels[category] || category;
}

/**
 * Render typography section
 */
function renderTypography(typography) {
  fontFamiliesList.innerHTML = '';
  headingsList.innerHTML = '';
  bodyText.innerHTML = '';

  if (!typography || (!typography.fontFamilies?.length && !typography.headings && !typography.body)) {
    typographyEmpty.classList.remove('hidden');
    return;
  }

  typographyEmpty.classList.add('hidden');

  // Font families
  if (typography.fontFamilies && typography.fontFamilies.length > 0) {
    fontFamiliesList.innerHTML = '<div class="font-families-title">Font Családok</div>';
    typography.fontFamilies.forEach(font => {
      const item = document.createElement('div');
      item.className = 'font-family-item';
      item.innerHTML = `
        <span class="font-family-name">${font.name}</span>
        <span class="font-family-usage">${font.usage}%</span>
        <button class="copy-btn" data-copy="${font.name}" title="Másolás">📋</button>
      `;
      fontFamiliesList.appendChild(item);
    });
  }

  // Headings
  if (typography.headings) {
    const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    let hasHeadings = false;

    headingTags.forEach(tag => {
      if (typography.headings[tag]) {
        hasHeadings = true;
        const h = typography.headings[tag];
        const item = document.createElement('div');
        item.className = 'heading-item';
        item.innerHTML = `
          <span class="heading-tag">${tag.toUpperCase()}</span>
          <div class="heading-details">
            ${h.fontFamily}, ${h.fontSize}, ${getWeightLabel(h.fontWeight)}, ${h.color}
            <br>line-height: ${h.lineHeight}
          </div>
          ${h.sample ? `<div class="heading-sample">"${h.sample}"</div>` : ''}
        `;
        headingsList.appendChild(item);
      }
    });

    if (hasHeadings) {
      headingsList.insertAdjacentHTML('afterbegin', '<div class="headings-title">Heading Stílusok</div>');
    }
  }

  // Body text
  if (typography.body) {
    const b = typography.body;
    bodyText.innerHTML = `
      <div class="body-title">Body Szöveg</div>
      <div class="body-details">
        ${b.fontFamily}, ${b.fontSize}, ${getWeightLabel(b.fontWeight)}, ${b.color}
        <br>line-height: ${b.lineHeight}
      </div>
    `;
  }

  // Add copy handlers
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', handleCopy);
  });
}

/**
 * Get weight label (numeric + text)
 */
function getWeightLabel(weight) {
  const labels = {
    '100': '100 (Thin)',
    '200': '200 (Extra Light)',
    '300': '300 (Light)',
    '400': '400 (Regular)',
    '500': '500 (Medium)',
    '600': '600 (Semibold)',
    '700': '700 (Bold)',
    '800': '800 (Extra Bold)',
    '900': '900 (Black)'
  };
  return labels[weight] || weight;
}

/**
 * Render images section
 */
function renderImages(images) {
  logoContainer.innerHTML = '';
  imagesList.innerHTML = '';
  svgsList.innerHTML = '';
  backgroundsList.innerHTML = '';

  if (!images) {
    imagesEmpty.classList.remove('hidden');
    imagesCount.textContent = '';
    return;
  }

  let totalCount = 0;

  // Logo
  if (images.logo) {
    totalCount++;
    logoContainer.innerHTML = `
      <div class="logo-title">Logó</div>
      <div class="logo-item">
        <img src="${images.logo.url}" alt="Logo" class="logo-preview" onerror="this.style.display='none'">
        <div class="logo-info">
          <div class="logo-name">${getFileName(images.logo.url)}</div>
          <div class="logo-dimensions">${images.logo.width || '?'}×${images.logo.height || '?'}px</div>
        </div>
        <button class="download-btn" data-url="${images.logo.url}" data-name="${getFileName(images.logo.url)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>
    `;
  }

  // All images
  if (images.all && images.all.length > 0) {
    totalCount += images.all.length;
    imagesList.innerHTML = `<div class="images-title">Képek (${images.all.length} db)</div>`;
    images.all.forEach(img => {
      const item = document.createElement('div');
      item.className = 'image-item';
      item.innerHTML = `
        <img src="${img.url}" alt="${img.alt || ''}" class="image-preview" onerror="this.style.display='none'">
        <div class="image-info">
          <div class="image-name">${getFileName(img.url)}</div>
          <div class="image-dimensions">${img.width || '?'}×${img.height || '?'}px</div>
        </div>
        <button class="download-btn" data-url="${img.url}" data-name="${getFileName(img.url)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      `;
      imagesList.appendChild(item);
    });
  }

  // SVGs
  if (images.svgs && images.svgs.length > 0) {
    totalCount += images.svgs.length;
    svgsList.innerHTML = `<div class="svgs-title">Inline SVG-k (${images.svgs.length} db)</div>`;
    images.svgs.forEach((svg, index) => {
      const item = document.createElement('div');
      item.className = 'svg-item';

      // Create SVG preview as data URI
      const svgDataUri = 'data:image/svg+xml;base64,' + btoa(svg.content.replace(/[\u00A0-\uFFFF]/g, c => '&#' + c.charCodeAt(0) + ';'));

      item.innerHTML = `
        <img src="${svgDataUri}" alt="SVG ${index + 1}" class="svg-preview" onerror="this.style.display='none'">
        <div class="svg-info">
          <div class="svg-name">svg-${index + 1}.svg</div>
          <div class="svg-dimensions">${svg.width || '?'}×${svg.height || '?'}px</div>
        </div>
        <button class="download-btn download-svg" data-svg-index="${index}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      `;
      svgsList.appendChild(item);
    });
  }

  // Background images
  if (images.backgrounds && images.backgrounds.length > 0) {
    totalCount += images.backgrounds.length;
    backgroundsList.innerHTML = `<div class="backgrounds-title">Háttérképek (${images.backgrounds.length} db)</div>`;
    images.backgrounds.forEach(bg => {
      const item = document.createElement('div');
      item.className = 'background-item';
      item.innerHTML = `
        <div class="background-info">
          <div class="background-url">${getFileName(bg.url)}</div>
          <div class="background-element">${bg.element}</div>
        </div>
        <button class="download-btn" data-url="${bg.url}" data-name="${getFileName(bg.url)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      `;
      backgroundsList.appendChild(item);
    });
  }

  // Update count
  if (totalCount > 0) {
    imagesCount.textContent = `${totalCount} db`;
    imagesEmpty.classList.add('hidden');
  } else {
    imagesEmpty.classList.remove('hidden');
    imagesCount.textContent = '';
  }

  // Add download handlers
  document.querySelectorAll('.download-btn:not(.download-svg)').forEach(btn => {
    btn.addEventListener('click', handleDownload);
  });

  document.querySelectorAll('.download-svg').forEach(btn => {
    btn.addEventListener('click', handleSvgDownload);
  });
}

/**
 * Get filename from URL
 */
function getFileName(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'unknown';
    return filename.length > 30 ? filename.substring(0, 27) + '...' : filename;
  } catch {
    return url.substring(0, 30) + '...';
  }
}

/**
 * Handle copy to clipboard
 */
async function handleCopy(event) {
  const btn = event.currentTarget;
  const text = btn.dataset.copy;
  const originalHTML = btn.innerHTML;

  try {
    await navigator.clipboard.writeText(text);
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 1500);
  } catch (error) {
    console.error('Copy failed:', error);
  }
}

/**
 * Handle image download
 */
function handleDownload(event) {
  const btn = event.currentTarget;
  const url = btn.dataset.url;
  const name = btn.dataset.name;

  // Use anchor element for download (no permission needed)
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Handle SVG download
 */
function handleSvgDownload(event) {
  const btn = event.currentTarget;
  const index = parseInt(btn.dataset.svgIndex);

  if (analysisData && analysisData.images && analysisData.images.svgs && analysisData.images.svgs[index]) {
    const svg = analysisData.images.svgs[index];
    const blob = new Blob([svg.content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    // Use anchor element for download
    const a = document.createElement('a');
    a.href = url;
    a.download = `svg-${index + 1}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Handle export button click
 */
function handleExport() {
  if (!analysisData) return;

  const report = generateReport(analysisData);
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const domain = new URL(analysisData.url).hostname.replace('www.', '');
  const date = new Date().toISOString().split('T')[0];
  const filename = `design-system-${domain}-${date}.txt`;

  // Use anchor element for download (no permission needed)
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate TXT report
 */
function generateReport(data) {
  const lines = [];
  const divider = '═══════════════════════════════════════';
  const subDivider = '───────────────────────────────────────';

  lines.push('DESIGN SYSTEM ÖSSZEFOGLALÓ');
  lines.push(divider);
  lines.push(`Oldal: ${data.url}`);
  lines.push(`Elemzés dátuma: ${new Date(data.timestamp).toLocaleString('hu-HU')}`);
  lines.push('');

  // Colors
  lines.push('🎨 SZÍNPALETTA');
  lines.push(subDivider);
  if (data.colors && data.colors.length > 0) {
    data.colors.forEach(color => {
      lines.push(`${color.hex} - ${getCategoryLabel(color.category)}`);
    });
  } else {
    lines.push('Nincs szín az oldalon');
  }
  lines.push('');

  // Typography
  lines.push('✏️ TIPOGRÁFIA');
  lines.push(subDivider);

  if (data.typography) {
    if (data.typography.fontFamilies && data.typography.fontFamilies.length > 0) {
      lines.push('Font Családok:');
      data.typography.fontFamilies.forEach(font => {
        lines.push(`  - ${font.name} (${font.usage}% használat)`);
      });
      lines.push('');
    }

    if (data.typography.headings) {
      lines.push('Heading Stílusok:');
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        if (data.typography.headings[tag]) {
          const h = data.typography.headings[tag];
          lines.push(`  ${tag.toUpperCase()}: ${h.fontFamily}, ${h.fontSize}, ${getWeightLabel(h.fontWeight)}, ${h.color}, line-height: ${h.lineHeight}`);
          if (h.sample) {
            lines.push(`      "${h.sample}"`);
          }
        }
      });
      lines.push('');
    }

    if (data.typography.body) {
      const b = data.typography.body;
      lines.push('Body Szöveg:');
      lines.push(`  ${b.fontFamily}, ${b.fontSize}, ${getWeightLabel(b.fontWeight)}, ${b.color}, line-height: ${b.lineHeight}`);
      lines.push('');
    }
  } else {
    lines.push('Nincs tipográfia információ');
    lines.push('');
  }

  // Images
  lines.push('🖼️ KÉPEK & LOGÓK');
  lines.push(subDivider);

  if (data.images) {
    if (data.images.logo) {
      lines.push(`Logó: ${data.images.logo.url}`);
      lines.push(`  Méret: ${data.images.logo.width || '?'}×${data.images.logo.height || '?'}px`);
      lines.push('');
    }

    if (data.images.all && data.images.all.length > 0) {
      lines.push(`Képek (${data.images.all.length} db):`);
      data.images.all.forEach(img => {
        lines.push(`  - ${img.url}`);
        lines.push(`    Méret: ${img.width || '?'}×${img.height || '?'}px`);
      });
      lines.push('');
    }

    if (data.images.svgs && data.images.svgs.length > 0) {
      lines.push(`Inline SVG-k (${data.images.svgs.length} db):`);
      data.images.svgs.forEach((svg, i) => {
        lines.push(`  - svg-${i + 1}.svg (${svg.width || '?'}×${svg.height || '?'}px)`);
      });
      lines.push('');
    }

    if (data.images.backgrounds && data.images.backgrounds.length > 0) {
      lines.push(`Háttérképek (${data.images.backgrounds.length} db):`);
      data.images.backgrounds.forEach(bg => {
        lines.push(`  - ${bg.url}`);
        lines.push(`    Element: ${bg.element}`);
      });
      lines.push('');
    }
  } else {
    lines.push('Nincs kép az oldalon');
    lines.push('');
  }

  lines.push(divider);
  lines.push('Generálva: Design System Analyzer v1.0.0');

  return lines.join('\n');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
