const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'server', 'src');
const loggerPathBase = path.join(srcDir, 'logger', 'winston.logger.ts');

function getRelativeLoggerPath(filePath) {
    const relative = path.relative(path.dirname(filePath), loggerPathBase);
    return relative.replace(/\\/g, '/').replace(/\.ts$/, '');
}

function processFile(filePath) {
    if (filePath.endsWith('winston.logger.ts') || filePath.endsWith('morgan.logger.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if it uses console
    if (/console\.(log|error|warn)/.test(content)) {
        // Replace console calls
        content = content.replace(/console\.log/g, 'logger.info');
        content = content.replace(/console\.error/g, 'logger.error');
        content = content.replace(/console\.warn/g, 'logger.warn');
        modified = true;

        // Add import if not present
        if (!content.includes('import logger from')) {
            const relPath = getRelativeLoggerPath(filePath);
            const importStmt = `import logger from '${relPath.startsWith('.') ? relPath : './' + relPath}'\n`;
            
            // Find first import or top of file
            const importMatch = content.match(/^import .+/m);
            if (importMatch) {
                content = content.replace(/^(import .+)/m, `${importStmt}$1`);
            } else {
                content = importStmt + content;
            }
        }
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

console.log(`Refactoring logs in ${srcDir}...`);
walk(srcDir);
console.log('Done!');
