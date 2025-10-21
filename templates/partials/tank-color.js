/**
   * Helper function: Parse hex color to RGB object
   */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse hex values
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

/**
 * Helper function: Convert RGB object to rgba string
 */
function rgbToRgba(rgb, alpha = 1) {
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/**
 * Helper function: Lighten/darken color by percentage
 * @param {Object} rgb - RGB color object {r, g, b}
 * @param {Number} percent - Percentage to adjust (-100 to 100)
 */
function adjustBrightness(rgb, percent) {
    return {
        r: Math.max(0, Math.min(255, rgb.r + (rgb.r * percent / 100))),
        g: Math.max(0, Math.min(255, rgb.g + (rgb.g * percent / 100))),
        b: Math.max(0, Math.min(255, rgb.b + (rgb.b * percent / 100)))
    };
}

/**
 * Helper function: Generate gradient stops from base color
 * Creates a metallic/3D effect gradient based on the input color
 */
function generateGradientStops(baseColor) {
    const rgb = typeof baseColor === 'string' ? hexToRgb(baseColor) : baseColor;

    // Create gradient stops with varying brightness levels
    return [
        { offset: 0, color: adjustBrightness(rgb, -30) },
        { offset: 0.048, color: adjustBrightness(rgb, -20) },
        { offset: 0.151, color: adjustBrightness(rgb, 0) },
        { offset: 0.240, color: adjustBrightness(rgb, 15) },
        { offset: 0.303, color: adjustBrightness(rgb, 20) },
        { offset: 0.407, color: adjustBrightness(rgb, 15) },
        { offset: 0.514, color: adjustBrightness(rgb, 5) },
        { offset: 0.621, color: adjustBrightness(rgb, -10) },
        { offset: 0.729, color: adjustBrightness(rgb, -25) },
        { offset: 0.838, color: adjustBrightness(rgb, -40) },
        { offset: 0.945, color: adjustBrightness(rgb, -55) },
        { offset: 1, color: adjustBrightness(rgb, -65) }
    ];
}

/**
 * Helper function: Generate simple gradient stops (for highlight gradients)
 */
function generateSimpleGradient(baseColor, opacity1 = 0.4, opacity2 = 0.7) {
    const rgb = typeof baseColor === 'string' ? hexToRgb(baseColor) : baseColor;
    const lighterColor = adjustBrightness(rgb, 40);

    return [
        { offset: 0, color: lighterColor, opacity: opacity1 },
        { offset: 1, color: lighterColor, opacity: opacity2 }
    ];
}

/**
 * Helper function: Update gradient element with new stops
 */
function updateGradient(gradientElement, stops) {
    if (!gradientElement) return;

    // Get all stop elements
    const stopElements = gradientElement.querySelectorAll('stop');

    stops.forEach((stop, index) => {
        if (stopElements[index]) {
            const opacity = stop.opacity !== undefined ? stop.opacity : 1;
            stopElements[index].setAttribute('stop-color', rgbToRgba(stop.color, opacity));
            if (stop.opacity !== undefined) {
                stopElements[index].setAttribute('stop-opacity', stop.opacity);
            }
        }
    });
}

/**
 * Main function: Change color of SVG element by data-tif-id or id
 * @param {String} elementId - The data-tif-id or id of the element
 * @param {String} color - Hex color code (e.g., '#FF5733')
 */
function changeColor(elementId, color) {
    // Find element by data-tif-id first, then fallback to id
    let element = document.querySelector(`[data-tif-id="${elementId}"]`);
    if (!element) {
        element = document.getElementById(elementId);
    }

    if (!element) {
        console.warn(`Element with identifier "${elementId}" not found`);
        return;
    } else {
        console.log("found element:", element);
    }

    const rgb = hexToRgb(color);

    // Find all linearGradient and radialGradient elements within this element
    const gradients = element.querySelectorAll('lineargradient, radialgradient');

    gradients.forEach(gradient => {
        const stops = gradient.querySelectorAll('stop');

        // Determine gradient type based on number of stops and their colors
        if (stops.length >= 10) {
            // Metallic/3D gradient (main body)
            const newStops = generateGradientStops(rgb);
            updateGradient(gradient, newStops);
        } else if (stops.length === 2) {
            // Simple gradient (highlights)
            const firstStop = stops[0];
            const hasOpacity = firstStop.hasAttribute('stop-opacity');

            if (hasOpacity) {
                const opacity1 = parseFloat(firstStop.getAttribute('stop-opacity')) || 0.4;
                const opacity2 = parseFloat(stops[1].getAttribute('stop-opacity')) || 0.7;
                const newStops = generateSimpleGradient(rgb, opacity1, opacity2);
                updateGradient(gradient, newStops);
            } else {
                // Two-tone gradient
                const newStops = [
                    { offset: 0, color: adjustBrightness(rgb, 30) },
                    { offset: 1, color: adjustBrightness(rgb, -20) }
                ];
                updateGradient(gradient, newStops);
            }
        } else if (stops.length === 14) {
            // Radial gradient (rounded parts)
            const radialStops = [
                { offset: 0.458, color: adjustBrightness(rgb, -65) },
                { offset: 0.484, color: adjustBrightness(rgb, -45) },
                { offset: 0.524, color: adjustBrightness(rgb, -20) },
                { offset: 0.564, color: adjustBrightness(rgb, 0) },
                { offset: 0.605, color: adjustBrightness(rgb, 15) },
                { offset: 0.646, color: adjustBrightness(rgb, 25) },
                { offset: 0.688, color: adjustBrightness(rgb, 30) },
                { offset: 0.732, color: adjustBrightness(rgb, 32) },
                { offset: 0.762, color: adjustBrightness(rgb, 28) },
                { offset: 0.802, color: adjustBrightness(rgb, 18) },
                { offset: 0.848, color: adjustBrightness(rgb, 3) },
                { offset: 0.899, color: adjustBrightness(rgb, -18) },
                { offset: 0.953, color: adjustBrightness(rgb, -45) },
                { offset: 0.978, color: adjustBrightness(rgb, -60) }
            ];
            updateGradient(gradient, radialStops);
        }
    });

    // Update solid fills (circles, rectangles, paths without gradients)
    const solidElements = element.querySelectorAll('[fill]:not([fill^="url"])');
    solidElements.forEach(el => {
        const currentFill = el.getAttribute('fill');
        if (currentFill && currentFill.startsWith('rgba')) {
            // Extract alpha from current fill
            const alphaMatch = currentFill.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
            const alpha = alphaMatch ? parseFloat(alphaMatch[1]) : 1;
            el.setAttribute('fill', rgbToRgba(rgb, alpha));
        } else if (currentFill && currentFill !== 'none') {
            el.setAttribute('fill', rgbToRgba(rgb, 1));
        }
    });
}


changeColor('DynamicSVG_1', '#FF002E');