const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'server', 'src');

function processFile(filePath) {
    if (filePath.endsWith('envs.ts')) return; // Don't process the new file
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Search for imports matching /config/env
    const importRegex = /from (['"])(\.?\.\/)+config\/env\1/g;
    
    if (importRegex.test(content)) {
        // Find relative path to envs.ts from this file
        const relativeToSrc = path.relative(path.dirname(filePath), srcDir);
        let newImportPath = path.join(relativeToSrc, 'envs').replace(/\\/g, '/');
        if (!newImportPath.startsWith('.')) {
            newImportPath = './' + newImportPath;
        }

        content = content.replace(importRegex, `from '${newImportPath}'`);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Processed: ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

console.log(`Refactoring imports in ${srcDir}...`);
walk(srcDir);
console.log('Done!');
