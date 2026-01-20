/**
 * Typography Analyzer - Tipográfia elemző modul
 * Kinyeri a fontokat, heading stílusokat és body text beállításokat
 */

const TypographyAnalyzer = {
  /**
   * Fő elemző függvény
   * @returns {Object} Tipográfia adatok
   */
  analyze() {
    return {
      fontFamilies: this.analyzeFontFamilies(),
      headings: this.analyzeHeadings(),
      body: this.analyzeBodyText()
    };
  },

  /**
   * Analyze all font families used on the page
   */
  analyzeFontFamilies() {
    const fontMap = new Map();
    const elements = document.querySelectorAll('*');
    let totalElements = 0;

    elements.forEach(element => {
      // Skip non-text elements
      if (!this.hasTextContent(element)) return;

      const styles = window.getComputedStyle(element);
      const fontFamily = this.cleanFontFamily(styles.fontFamily);

      if (fontFamily) {
        totalElements++;
        if (fontMap.has(fontFamily)) {
          fontMap.set(fontFamily, fontMap.get(fontFamily) + 1);
        } else {
          fontMap.set(fontFamily, 1);
        }
      }
    });

    // Convert to array with usage percentages
    const fonts = Array.from(fontMap.entries())
      .map(([name, count]) => ({
        name: name,
        usage: Math.round((count / totalElements) * 100)
      }))
      .filter(font => font.usage >= 1)
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    return fonts;
  },

  /**
   * Analyze heading styles (H1-H6)
   */
  analyzeHeadings() {
    const headings = {};
    const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    headingTags.forEach(tag => {
      const element = document.querySelector(tag);
      if (element) {
        const styles = window.getComputedStyle(element);
        headings[tag] = {
          fontFamily: this.cleanFontFamily(styles.fontFamily),
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: this.normalizeLineHeight(styles.lineHeight, styles.fontSize),
          color: this.toHex(styles.color),
          sample: this.getSampleText(element, 50)
        };
      }
    });

    return Object.keys(headings).length > 0 ? headings : null;
  },

  /**
   * Analyze body/paragraph text
   */
  analyzeBodyText() {
    // Try to find body text from common elements
    const selectors = ['p', 'body', '.content', 'main', 'article'];
    let element = null;

    for (const selector of selectors) {
      element = document.querySelector(selector);
      if (element && this.hasDirectTextContent(element)) {
        break;
      }
    }

    if (!element) {
      // Fallback to body
      element = document.body;
    }

    const styles = window.getComputedStyle(element);

    return {
      fontFamily: this.cleanFontFamily(styles.fontFamily),
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      lineHeight: this.normalizeLineHeight(styles.lineHeight, styles.fontSize),
      color: this.toHex(styles.color)
    };
  },

  /**
   * Clean font family string (extract primary font)
   */
  cleanFontFamily(fontFamily) {
    if (!fontFamily) return null;

    // Split by comma and take first font
    const fonts = fontFamily.split(',');
    let primaryFont = fonts[0].trim();

    // Remove quotes
    primaryFont = primaryFont.replace(/["']/g, '');

    // Skip system fonts and return second option if available
    const systemFonts = ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif', 'serif', 'monospace'];
    if (systemFonts.includes(primaryFont) && fonts.length > 1) {
      primaryFont = fonts[1].trim().replace(/["']/g, '');
    }

    return primaryFont;
  },

  /**
   * Normalize line-height to ratio format
   */
  normalizeLineHeight(lineHeight, fontSize) {
    if (lineHeight === 'normal') {
      return '1.2';
    }

    // If pixel value, convert to ratio
    if (lineHeight.endsWith('px')) {
      const lhPx = parseFloat(lineHeight);
      const fsPx = parseFloat(fontSize);
      if (fsPx > 0) {
        return (lhPx / fsPx).toFixed(2);
      }
    }

    return lineHeight;
  },

  /**
   * Check if element has text content
   */
  hasTextContent(element) {
    return element.textContent && element.textContent.trim().length > 0;
  },

  /**
   * Check if element has direct text content (not from children)
   */
  hasDirectTextContent(element) {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
        return true;
      }
    }
    return false;
  },

  /**
   * Get sample text from element
   */
  getSampleText(element, maxLength) {
    let text = element.textContent || '';
    text = text.trim().replace(/\s+/g, ' ');

    if (text.length > maxLength) {
      return text.substring(0, maxLength - 3) + '...';
    }

    return text;
  },

  /**
   * Convert color to HEX
   */
  toHex(color) {
    if (color.startsWith('rgb')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
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

    if (color.startsWith('#')) {
      return color.toUpperCase();
    }

    return color;
  }
};

// Export for content script
if (typeof window !== 'undefined') {
  window.TypographyAnalyzer = TypographyAnalyzer;
}
