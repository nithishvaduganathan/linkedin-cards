/**
 * Generate keyframes for a single image in a carousel
 * @param {number} index - Image index (0-based)
 * @param {number} totalImages - Total number of images
 * @param {number} transitionPercent - Transition duration as percentage (default 6%)
 * @returns {string} CSS keyframe animation string
 */
function generateImageKeyframe(index, totalImages, transitionPercent = 6) {
    if (totalImages === 1) {
        return '@keyframes static1 { 0% {opacity:1} 100% {opacity:1} }';
    }
    
    const slotDuration = 100 / totalImages;
    const halfTransition = transitionPercent / 2;
    const startVisible = index * slotDuration;
    const endVisible = (index + 1) * slotDuration - halfTransition;
    const startFadeOut = endVisible;
    const endFadeOut = (index + 1) * slotDuration;
    const startFadeIn = 100 - halfTransition;
    
    let keyframe = `@keyframes cycle${totalImages}_${index + 1} { `;
    
    if (index === 0) {
        // Primera imagen: visible al inicio, fade out, invisible, fade in al final
        keyframe += `0% {opacity:1} `;
        keyframe += `${endVisible}% {opacity:1} `;
        keyframe += `${endFadeOut}% {opacity:0} `;
        keyframe += `${startFadeIn}% {opacity:0} `;
        keyframe += `100% {opacity:1}`;
    } else {
        // Otras imágenes: invisible, fade in, visible, fade out, invisible
        keyframe += `0% {opacity:0} `;
        keyframe += `${startVisible - halfTransition}% {opacity:0} `;
        keyframe += `${startVisible}% {opacity:1} `;
        keyframe += `${endVisible}% {opacity:1} `;
        keyframe += `${endFadeOut}% {opacity:0} `;
        keyframe += `100% {opacity:0}`;
    }
    
    keyframe += ' }';
    return keyframe;
}

/**
 * Get animation keyframes and classes for image carousel based on image count
 * @param {number} imageCount - Number of images in the carousel
 * @returns {Object} Object with keyframes and classes properties
 */
export function getAnimationKeyframes(imageCount) {
    const count = Math.min(imageCount, 4); // Use 4 as a limit to avoid lag
    
    if (count === 1) {
        return {
            keyframes: '@keyframes static1 { 0% {opacity:1} 100% {opacity:1} }',
            classes: '.img-1 { animation-name: static1; opacity: 1; }'
        };
    }
    
    // Generate keyframes for every image
    const keyframes = [];
    const classes = [];
    
    for (let i = 0; i < count; i++) {
        keyframes.push(generateImageKeyframe(i, count));
        const opacity = i === 0 ? 'opacity: 1;' : '';
        classes.push(`.img-${i + 1} { animation-name: cycle${count}_${i + 1}; ${opacity} }`);
    }
    
    return {
        keyframes: keyframes.join('\n                '),
        classes: classes.join('\n                ')
    };
}
