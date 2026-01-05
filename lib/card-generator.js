import fs from 'fs';
import path from 'path';
import { fetchImageAsBase64 } from './image-utils.js';
import { getAnimationKeyframes } from './animations.js';
import { translateRelativeTime } from './translations.js';

/**
 * Generate SVG card for a LinkedIn post
 * @param {Object} post - LinkedIn post object
 * @param {string} outputDir - Directory to save generated cards
 * @param {string} templateDir - Directory containing SVG templates
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Object with timestamp and url of generated card
 */
export async function generateCard(post, outputDir, templateDir, options = {}) {
    const {
        language = 'en',
        translations = {}
    } = options;
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const hasImages = post.media && (post.media.type === 'image' || post.media.type === 'images');
    const images = hasImages ? (post.media.images || [{ url: post.media.url }]) : [];
    
    const name = `${post.author.first_name} ${post.author.last_name || ''}`.trim();
    const bio = post.author.headline || '';
    const profilePicture = await fetchImageAsBase64(post.author.profile_picture);
    const text = post.text;
    const timeRaw = post.posted_at.relative.split('•')[0].trim();
    const time = translateRelativeTime(timeRaw, language, translations);
    const reactions = post.stats.total_reactions;
    const commentCount = post.stats.comments;
    const commentKey = commentCount === 1 ? 'comment' : 'comments';
    const commentsText = translations[language]?.[commentKey] || (commentCount === 1 ? 'comment' : 'comments');
    const comments = `${commentCount} ${commentsText}`;
    
    const imageBase64 = [];
    for (let i = 0; i < Math.min(images.length, 4); i++) {
        imageBase64.push(await fetchImageAsBase64(images[i].url));
    }
    
    const themes = ['light', 'dark'];
    
    for (const theme of themes) {
        const templateName = hasImages ? `linkedin-post-${theme}.svg` : `linkedin-post-${theme}-text.svg`;
        const templatePath = path.join(templateDir, templateName);
        let template = fs.readFileSync(templatePath, 'utf8');
        
        template = template.replace(/\$\{name\}/g, name);
        template = template.replace(/\$\{bio\}/g, bio);
        template = template.replace(/\$\{profile_picture\}/g, profilePicture);
        template = template.replace(/\$\{text\}/g, text);
        template = template.replace(/\$\{time\}/g, time);
        template = template.replace(/\$\{reactions\}/g, reactions);
        template = template.replace(/\$\{comments\}/g, comments);
        
        if (hasImages && imageBase64.length > 0) {
            const animations = getAnimationKeyframes(imageBase64.length);
            
            template = template.replace(
                /@keyframes cycle1 \{[^}]+\}\s*@keyframes cycle2 \{[^}]+\}\s*@keyframes cycle3 \{[^}]+\}/,
                animations.keyframes
            );
            
            template = template.replace(
                /\.img-1 \{[^}]+\}\s*\.img-2 \{[^}]+\}\s*\.img-3 \{[^}]+\}/,
                animations.classes
            );
            
            const galleryDivs = imageBase64.map((img, i) => 
                `            <div class="gallery-slide img-${i + 1}" style="background-image: url(${img});"></div>`
            ).join('\n');
            
            template = template.replace(
                /<div class="gallery-container">\s*<\/div>/,
                `<div class="gallery-container">\n${galleryDivs}\n        </div>`
            );
        }
        
        const timestamp = post.posted_at.timestamp;
        const outputPath = path.join(outputDir, `${timestamp}-${theme}.svg`);
        fs.writeFileSync(outputPath, template, 'utf8');
        console.log(`Card generated: ${outputPath}`);
    }
    
    return {
        timestamp: post.posted_at.timestamp.toString(),
        url: post.url
    };
}
