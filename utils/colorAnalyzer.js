/**
 * Color Analyzer - Design System szín elemző modul
 * StyleSheets API + kulcs elemek alapján azonosítja a design system színeket
 * Kategóriák: primary, secondary, background, foreground, accent, border
 */

const ColorAnalyzer = {
  /**
   * Fő elemző függvény
   * @returns {Array} Design system színek kategóriákkal
   */
  analyze() {
    const colors = {
      background: new Map(),
      foreground: new Map(),
      primary: new Map(),
      accent: new Map(),
      border: new Map()
    };

    // 1. StyleSheets API - CSS-ben definiált színek
    this.analyzeStyleSheets(colors);

    // 2. Kulcs elemek computed styles (body, buttons, links, headings)
    this.analyzeKeyElements(colors);

    // 3. Összesítés és kategorizálás
    return this.buildColorPalette(colors);
  },

  /**
   * StyleSheets API elemzés
   */
  analyzeStyleSheets(colors) {
    try {
      for (const sheet of document.styleSheets) {
        try {
          // Cross-origin stylesheets nem olvashatók
          if (!sheet.cssRules) continue;

          for (const rule of sheet.cssRules) {
            if (!(rule instanceof CSSStyleRule)) continue;

            const style = rule.style;
            const selector = rule.selectorText || '';

            // Background colors
            const bgColor = style.backgroundColor;
            if (bgColor && this.isValidColor(bgColor)) {
              const hex = this.toHex(bgColor);
              if (hex) {
                const category = this.categorizeBySelector(selector, 'background');
                this.addColor(colors[category], hex, selector);
              }
            }

            // Text colors
            const textColor = style.color;
            if (textColor && this.isValidColor(textColor)) {
              const hex = this.toHex(textColor);
              if (hex) {
                const category = this.categorizeBySelector(selector, 'text');
                this.addColor(colors[category], hex, selector);
              }
            }

            // Border colors
            const borderColor = style.borderColor || style.borderTopColor;
            if (borderColor && this.isValidColor(borderColor)) {
              const hex = this.toHex(borderColor);
              if (hex) {
                this.addColor(colors.border, hex, selector);
              }
            }
          }
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      }
    } catch (e) {
      console.log('StyleSheets analysis skipped:', e.message);
    }
  },

  /**
   * Kulcs elemek elemzése computed styles-szal
   */
  analyzeKeyElements(colors) {
    // Body background és text
    const body = document.body;
    if (body) {
      const bodyStyles = window.getComputedStyle(body);
      const bgHex = this.toHex(bodyStyles.backgroundColor);
      const textHex = this.toHex(bodyStyles.color);

      if (bgHex && bgHex !== '#FFFFFF' && bgHex !== '#000000') {
        this.addColor(colors.background, bgHex, 'body', 1000);
      } else if (bgHex) {
        this.addColor(colors.background, bgHex, 'body', 500);
      }

      if (textHex) {
        this.addColor(colors.foreground, textHex, 'body', 1000);
      }
    }

    // HTML background (ha van)
    const html = document.documentElement;
    if (html) {
      const htmlStyles = window.getComputedStyle(html);
      const bgHex = this.toHex(htmlStyles.backgroundColor);
      if (bgHex && this.isValidColor(htmlStyles.backgroundColor)) {
        this.addColor(colors.background, bgHex, 'html', 800);
      }
    }

    // Primary/Accent: gombok, linkek
    const buttons = document.querySelectorAll('button, [type="submit"], [type="button"], .btn, .button, [class*="btn-"], [class*="button-"]');
    buttons.forEach(btn => {
      const styles = window.getComputedStyle(btn);
      const bgHex = this.toHex(styles.backgroundColor);
      const textHex = this.toHex(styles.color);

      if (bgHex && this.isValidColor(styles.backgroundColor) && !this.isNeutral(bgHex)) {
        this.addColor(colors.primary, bgHex, 'button', 100);
      }
      if (textHex && !this.isNeutral(textHex)) {
        this.addColor(colors.accent, textHex, 'button-text', 50);
      }
    });

    // Links - accent color
    const links = document.querySelectorAll('a[href]');
    const linkColors = new Set();
    links.forEach(link => {
      const styles = window.getComputedStyle(link);
      const hex = this.toHex(styles.color);
      if (hex && !this.isNeutral(hex)) {
        linkColors.add(hex);
      }
    });
    linkColors.forEach(hex => {
      this.addColor(colors.accent, hex, 'link', 80);
    });

    // Headings - foreground variants
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      const styles = window.getComputedStyle(h);
      const hex = this.toHex(styles.color);
      if (hex) {
        this.addColor(colors.foreground, hex, h.tagName.toLowerCase(), 60);
      }
    });

    // Main containers - background
    const containers = document.querySelectorAll('main, article, section, .container, .wrapper, .content, [class*="card"], [class*="modal"], header, footer, nav');
    containers.forEach(el => {
      const styles = window.getComputedStyle(el);
      const bgHex = this.toHex(styles.backgroundColor);
      if (bgHex && this.isValidColor(styles.backgroundColor)) {
        this.addColor(colors.background, bgHex, el.tagName.toLowerCase(), 40);
      }

      const borderHex = this.toHex(styles.borderTopColor);
      if (borderHex && this.isValidColor(styles.borderTopColor) && parseFloat(styles.borderTopWidth) > 0) {
        this.addColor(colors.border, borderHex, 'container-border', 30);
      }
    });

    // Input fields - borders
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const styles = window.getComputedStyle(input);
      const borderHex = this.toHex(styles.borderTopColor);
      if (borderHex && this.isValidColor(styles.borderTopColor)) {
        this.addColor(colors.border, borderHex, 'input', 20);
      }
    });
  },

  /**
   * Selector alapján kategorizálás
   */
  categorizeBySelector(selector, type) {
    const sel = selector.toLowerCase();

    if (type === 'background') {
      if (sel.includes('btn') || sel.includes('button') || sel.includes('primary')) {
        return 'primary';
      }
      return 'background';
    }

    if (type === 'text') {
      if (sel.includes('btn') || sel.includes('button') || sel.includes('link') ||
          sel.includes('primary') || sel.includes('accent')) {
        return 'accent';
      }
      return 'foreground';
    }

    return 'border';
  },

  /**
   * Szín hozzáadása Map-hez
   */
  addColor(map, hex, source, weight = 1) {
    if (!hex) return;

    if (map.has(hex)) {
      const existing = map.get(hex);
      existing.weight += weight;
      existing.sources.add(source);
    } else {
      map.set(hex, {
        hex,
        weight,
        sources: new Set([source])
      });
    }
  },

  /**
   * Végső paletta összeállítása
   */
  buildColorPalette(colors) {
    const result = [];
    const seen = new Set();

    // Kategória sorrend és címkék
    const categories = [
      { key: 'primary', label: 'Primary' },
      { key: 'accent', label: 'Accent' },
      { key: 'background', label: 'Background' },
      { key: 'foreground', label: 'Foreground' },
      { key: 'border', label: 'Border' }
    ];

    categories.forEach(({ key, label }) => {
      const colorMap = colors[key];
      const sorted = Array.from(colorMap.values())
        .sort((a, b) => b.weight - a.weight);

      sorted.forEach(item => {
        if (seen.has(item.hex)) return;
        seen.add(item.hex);

        result.push({
          hex: item.hex,
          category: label,
          weight: item.weight,
          sources: Array.from(item.sources).slice(0, 3).join(', ')
        });
      });
    });

    // Max 20 szín, súly szerint rendezve de kategóriák megtartva
    return result.slice(0, 20);
  },

  /**
   * Ellenőrzi hogy valid szín-e (nem transparent, nem rgba(0,0,0,0))
   */
  isValidColor(color) {
    if (!color) return false;
    if (color === 'transparent') return false;
    if (color === 'rgba(0, 0, 0, 0)') return false;
    if (color === 'initial' || color === 'inherit') return false;
    return true;
  },

  /**
   * Ellenőrzi hogy neutrális szín-e (fekete, fehér, szürke)
   */
  isNeutral(hex) {
    if (!hex) return true;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Szürkeárnyalat ellenőrzés (r,g,b közel egyforma)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    return saturation < 0.1; // Alacsony saturáció = neutrális
  },

  /**
   * Convert any color format to HEX
   */
  toHex(color) {
    if (!color) return null;

    // Handle rgb/rgba
    if (color.startsWith('rgb')) {
      const match = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return '#' + [r, g, b].map(x => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
      }
    }

    // Handle hsl/hsla
    if (color.startsWith('hsl')) {
      const match = color.match(/hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
      if (match) {
        const h = parseFloat(match[1]) / 360;
        const s = parseFloat(match[2]) / 100;
        const l = parseFloat(match[3]) / 100;
        const rgb = this.hslToRgb(h, s, l);
        return '#' + rgb.map(x => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
      }
    }

    // Handle hex
    if (color.startsWith('#')) {
      let hex = color.toUpperCase();
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      if (hex.length === 9) {
        hex = hex.substring(0, 7);
      }
      return hex;
    }

    // Handle named colors using canvas
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = color;
      const computed = ctx.fillStyle;
      if (computed.startsWith('#')) {
        return computed.toUpperCase();
      }
      if (computed.startsWith('rgb')) {
        return this.toHex(computed);
      }
    } catch (e) {
      // Ignore
    }

    return null;
  },

  /**
   * HSL to RGB conversion
   */
  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
  }
};

// Export for content script
if (typeof window !== 'undefined') {
  window.ColorAnalyzer = ColorAnalyzer;
}
