const fs = require('fs');
const path = require('path');

class CodebaseScanner {

    static scan() {

        return {

            pages:
                this.getFiles('pages'),

            tests:
                this.getFiles('tests')

        };
    }

    static getFiles(folderPath) {

        const files = [];

        if (!fs.existsSync(folderPath)) {
            return files;
        }

        this.walk(folderPath, files);

        return files;
    }

    static walk(currentPath, files) {

        const items =
            fs.readdirSync(currentPath);

        for (const item of items) {

            const fullPath =
                path.join(
                    currentPath,
                    item
                );

            const stat =
                fs.statSync(fullPath);

            if (stat.isDirectory()) {

                this.walk(
                    fullPath,
                    files
                );

            } else {

                files.push(
                    fullPath
                );
            }
        }
    }
}

module.exports =
    CodebaseScanner;