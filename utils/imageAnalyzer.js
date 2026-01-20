/**
 * Image Analyzer - Kép elemző modul
 * Kinyeri a logókat, képeket, SVG-ket és háttérképeket
 */

const ImageAnalyzer = {
  /**
   * Fő elemző függvény
   * @returns {Object} Kép adatok
   */
  analyze() {
    return {
      logo: this.detectLogo(),
      all: this.getAllImages(),
      svgs: this.getInlineSvgs(),
      backgrounds: this.getBackgroundImages()
    };
  },

  /**
   * Detect logo using heuristics
   */
  detectLogo() {
    // Strategy 1: Look for img with logo-related attributes
    const logoSelectors = [
      'img[alt*="logo" i]',
      'img[alt*="brand" i]',
      'img[class*="logo" i]',
      'img[id*="logo" i]',
      'img[class*="brand" i]',
      '.logo img',
      '#logo img',
      '[class*="logo"] img',
      'header img:first-of-type',
      'nav img:first-of-type',
      'a[href="/"] img',
      'a[href="./"] img'
    ];

    for (const selector of logoSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.src) {
          return this.getImageInfo(element);
        }
      } catch (e) {
        // Skip invalid selectors
      }
    }

    // Strategy 2: Look for SVG logo
    const svgLogoSelectors = [
      'svg[class*="logo" i]',
      '.logo svg',
      '#logo svg',
      'header svg:first-of-type',
      'nav svg:first-of-type'
    ];

    for (const selector of svgLogoSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          return this.getSvgInfo(element, true);
        }
      } catch (e) {
        // Skip invalid selectors
      }
    }

    // Strategy 3: First image in header/nav
    const headerImg = document.querySelector('header img, nav img');
    if (headerImg && headerImg.src) {
      return this.getImageInfo(headerImg);
    }

    return null;
  },

  /**
   * Get all images from the page
   */
  getAllImages() {
    const images = [];
    const imgElements = document.querySelectorAll('img[src]');

    imgElements.forEach(img => {
      // Skip tracking pixels and tiny images
      if (img.width < 10 || img.height < 10) return;
      // Skip base64 data URIs that are very small
      if (img.src.startsWith('data:') && img.src.length < 100) return;

      const info = this.getImageInfo(img);
      if (info && info.url) {
        images.push(info);
      }
    });

    // Sort by size (largest first)
    images.sort((a, b) => {
      const areaA = (a.width || 0) * (a.height || 0);
      const areaB = (b.width || 0) * (b.height || 0);
      return areaB - areaA;
    });

    return images;
  },

  /**
   * Get info about an image element
   */
  getImageInfo(img) {
    if (!img || !img.src) return null;

    return {
      url: img.src,
      alt: img.alt || '',
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      type: this.getFileType(img.src)
    };
  },

  /**
   * Get all inline SVGs
   */
  getInlineSvgs() {
    const svgs = [];
    const svgElements = document.querySelectorAll('svg');

    svgElements.forEach(svg => {
      // Skip tiny SVGs (likely icons less than 10px)
      const rect = svg.getBoundingClientRect();
      if (rect.width < 5 && rect.height < 5) return;

      const info = this.getSvgInfo(svg, false);
      if (info) {
        svgs.push(info);
      }
    });

    return svgs;
  },

  /**
   * Get info about an SVG element
   */
  getSvgInfo(svg, isLogo = false) {
    if (!svg) return null;

    // Get dimensions
    const rect = svg.getBoundingClientRect();
    const width = Math.round(rect.width) || svg.getAttribute('width') || null;
    const height = Math.round(rect.height) || svg.getAttribute('height') || null;

    // Get SVG content
    const svgClone = svg.cloneNode(true);

    // Add xmlns if missing
    if (!svgClone.getAttribute('xmlns')) {
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // Set dimensions if available
    if (width) svgClone.setAttribute('width', width);
    if (height) svgClone.setAttribute('height', height);

    const content = new XMLSerializer().serializeToString(svgClone);

    if (isLogo) {
      // For logo, return URL-friendly format
      const blob = new Blob([content], { type: 'image/svg+xml' });
      return {
        url: URL.createObjectURL(blob),
        width: width,
        height: height,
        type: 'svg',
        content: content
      };
    }

    return {
      width: width,
      height: height,
      content: content
    };
  },

  /**
   * Get all background images
   */
  getBackgroundImages() {
    const backgrounds = [];
    const elements = document.querySelectorAll('*');

    elements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const bgImage = styles.backgroundImage;

      if (bgImage && bgImage !== 'none') {
        // Extract URL from background-image
        const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
        if (urlMatch && urlMatch[1]) {
          const url = urlMatch[1];

          // Skip data URIs and gradients
          if (url.startsWith('data:') || url.includes('gradient')) return;

          backgrounds.push({
            url: this.resolveUrl(url),
            element: this.getElementSelector(element)
          });
        }
      }
    });

    // Remove duplicates
    const uniqueBackgrounds = [];
    const seenUrls = new Set();

    backgrounds.forEach(bg => {
      if (!seenUrls.has(bg.url)) {
        seenUrls.add(bg.url);
        uniqueBackgrounds.push(bg);
      }
    });

    return uniqueBackgrounds;
  },

  /**
   * Get file type from URL
   */
  getFileType(url) {
    if (!url) return 'unknown';

    if (url.startsWith('data:')) {
      const match = url.match(/data:image\/(\w+)/);
      return match ? match[1] : 'unknown';
    }

    const extension = url.split('.').pop().split('?')[0].toLowerCase();
    const validTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif'];

    return validTypes.includes(extension) ? extension : 'unknown';
  },

  /**
   * Resolve relative URL to absolute
   */
  resolveUrl(url) {
    if (url.startsWith('http') || url.startsWith('data:')) {
      return url;
    }

    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  },

  /**
   * Get a simple selector for an element
   */
  getElementSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className && typeof element.className === 'string') {
      const mainClass = element.className.split(' ')[0];
      if (mainClass) {
        return `${element.tagName.toLowerCase()}.${mainClass}`;
      }
    }

    return element.tagName.toLowerCase();
  }
};

// Export for content script
if (typeof window !== 'undefined') {
  window.ImageAnalyzer = ImageAnalyzer;
}
