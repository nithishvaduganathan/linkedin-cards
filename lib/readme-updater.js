import fs from 'fs';
import path from 'path';

/**
 * Update README.md with generated LinkedIn card links
 * @param {string} readmePath - Path to README.md file
 * @param {Array} generatedCardsData - Array of card data objects with timestamp and url
 * @param {Object} options - Configuration options
 */
export function updateReadme(readmePath, generatedCardsData, options = {}) {
    const {
        githubRepo = process.env.GITHUB_REPOSITORY || '',
        githubBranch = process.env.GITHUB_REF_NAME || 'main',
        commentTag = process.env.COMMENT_TAG_NAME || 'LINKEDIN-CARDS',
        linkedinUsername = process.env.LINKEDIN_USERNAME
    } = options;
    
    if (!fs.existsSync(readmePath)) {
        console.error('README.md not found at:', readmePath);
        return;
    }
    
    let readme = fs.readFileSync(readmePath, 'utf8');
    
    console.log('Repo:', githubRepo || 'Not found');
    console.log('Branch:', githubBranch);
    
    const cardHTML = generatedCardsData.map((card, index) => {
        const lightPath = githubRepo 
            ? `https://github.com/${githubRepo}/blob/${githubBranch}/cards/${card.timestamp}-light.svg`
            : `cards/${card.timestamp}-light.svg`;
        const darkPath = githubRepo 
            ? `https://github.com/${githubRepo}/blob/${githubBranch}/cards/${card.timestamp}-dark.svg`
            : `cards/${card.timestamp}-dark.svg`;
        const postUrl = card.url || `https://linkedin.com/in/${linkedinUsername}`;
        return `  <a href="${postUrl}">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="${darkPath}">
      <source media="(prefers-color-scheme: light)" srcset="${lightPath}">
      <img alt="LinkedIn Card ${index + 1}" src="${lightPath}" width="320px">
    </picture>
  </a>`;
    }).join('\n');
    
    const fullHTML = `<p align="center">\n${cardHTML}\n</p>`;
    
    const beginMarker = `<!-- BEGIN ${commentTag} -->`;
    const endMarker = `<!-- END ${commentTag} -->`;
    const beginIndex = readme.indexOf(beginMarker);
    const endIndex = readme.indexOf(endMarker);
    
    console.log('Looking for the tags...');
    console.log('   Begin marker:', beginMarker, beginIndex !== -1 ? '✓' : '✗');
    console.log('   End marker:', endMarker, endIndex !== -1 ? '✓' : '✗');
    
    if (beginIndex !== -1 && endIndex !== -1) {
        const before = readme.substring(0, beginIndex + beginMarker.length);
        const after = readme.substring(endIndex);
        readme = before + '\n' + fullHTML + '\n' + after;
        fs.writeFileSync(readmePath, readme, 'utf8');
        console.log('README updated with generated cards');
    } else {
        console.error(`Tags ${beginMarker} and ${endMarker} were not found README.md`);
        console.log('Make sure you have these comments inside your README.md:');
        console.log(`   ${beginMarker}`);
        console.log(`   ${endMarker}`);
    }
}
