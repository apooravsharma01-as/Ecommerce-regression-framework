const fs = require('fs');
const path = require('path');
const UiEvidenceHelper =
    require('./UiEvidenceHelper');

let allure = null;

try {
    allure =
        require('allure-playwright').allure;
} catch {
    allure = null;
}

class EvidenceLogger {

    static context = {
        testName: null,
        testFile: null,
        suite: null
    };

    static setContext(ctx = {}) {

        this.context = {
            ...this.context,
            ...ctx
        };
    }

    static getContext() {

        return { ...this.context };
    }

    static getFeedPath(rootDir = process.cwd()) {

        return path.join(
            rootDir,
            '.cache/evidence-live.jsonl'
        );
    }

    static getLiveMediaDir(rootDir = process.cwd()) {

        return path.join(
            rootDir,
            'test-results/evidence-live'
        );
    }

    static clear(rootDir = process.cwd()) {

        const feedPath =
            this.getFeedPath(rootDir);

        if (fs.existsSync(feedPath)) {
            fs.unlinkSync(feedPath);
        }

        const mediaDir =
            this.getLiveMediaDir(rootDir);

        if (fs.existsSync(mediaDir)) {
            fs.rmSync(mediaDir, {
                recursive: true,
                force: true
            });
        }
    }

    static append(entry, rootDir = process.cwd()) {

        const feedPath =
            this.getFeedPath(rootDir);

        fs.mkdirSync(
            path.dirname(feedPath),
            { recursive: true }
        );

        fs.appendFileSync(
            feedPath,
            JSON.stringify({
                ...entry,
                timestamp: Date.now()
            }) + '\n'
        );
    }

    static async attachAllure(name, content, type) {

        if (!allure) {
            return;
        }

        try {
            await allure.attachment(
                name,
                content,
                type
            );
        } catch {
            // allure not active in this context
        }
    }

    static saveLiveMedia(buffer, label, rootDir, ext) {

        const mediaDir =
            this.getLiveMediaDir(rootDir);

        fs.mkdirSync(mediaDir, { recursive: true });

        const safeLabel =
            String(label)
                .replace(/[^a-zA-Z0-9]+/g, '_')
                .slice(0, 48);

        const fileName =
            `${Date.now()}-${safeLabel}.${ext}`;

        const filePath =
            path.join(mediaDir, fileName);

        fs.writeFileSync(filePath, buffer);

        const relative =
            path.join('evidence-live', fileName);

        return {
            filePath,
            relative,
            mediaUrl:
                UiEvidenceHelper.encodeMediaPath(
                    '/api/evidence/files',
                    relative
                )
        };
    }

    static async logApi(label, {
        method = 'POST',
        url = '',
        request = null,
        status = null,
        response = null
    }) {

        const reqPayload = {
            method,
            url,
            body: request
        };

        const resPayload = {
            status,
            body: response
        };

        const reqText =
            JSON.stringify(reqPayload, null, 2);

        const resText =
            JSON.stringify(resPayload, null, 2);

        await this.attachAllure(
            `API Request — ${label}`,
            reqText,
            'application/json'
        );

        await this.attachAllure(
            `API Response — ${label}`,
            resText,
            'application/json'
        );

        const ApiAssertions =
            require('./ApiAssertions');

        this.append({
            id: `api-${Date.now()}-${label}`,
            type: 'api',
            label,
            title: `API · ${label}`,
            method,
            url,
            request,
            httpStatus: status,
            response,
            businessOutcome:
                ApiAssertions.deriveOutcome(
                    response,
                    status
                ),
            testName: this.context.testName,
            testFile: this.context.testFile,
            suite: this.context.suite
        });
    }

    static async logDb(label, record) {

        const DbVerify =
            require('../database/DbVerify');

        const status =
            record?.status
            || DbVerify.resolveVerificationStatus(record);

        const payload = {
            ...record,
            status
        };

        const text =
            JSON.stringify(payload, null, 2);

        await this.attachAllure(
            `DB Record — ${label}`,
            text,
            'application/json'
        );

        this.append({
            id: `db-${Date.now()}-${label}`,
            type: 'db',
            label,
            title: `DB · ${label}`,
            status,
            record: payload,
            testName: this.context.testName,
            testFile: this.context.testFile,
            suite: this.context.suite
        });
    }

    static async logScreenshot(
        label,
        buffer,
        rootDir = process.cwd()
    ) {

        const saved =
            this.saveLiveMedia(
                buffer,
                label,
                rootDir,
                'png'
            );

        await this.attachAllure(
            `Screenshot — ${label}`,
            buffer,
            'image/png'
        );

        this.append({
            id: `ui-${Date.now()}-${label}`,
            type: 'ui',
            label,
            title: `Screenshot — ${label}`,
            mediaUrl: saved.mediaUrl,
            ready: true
        });

        return saved;
    }

    static async logVideo(
        label,
        sourcePath,
        rootDir = process.cwd()
    ) {

        if (
            !sourcePath
            || !fs.existsSync(sourcePath)
        ) {
            return null;
        }

        const buffer =
            fs.readFileSync(sourcePath);

        if (buffer.length < 2048) {
            return null;
        }

        const saved =
            this.saveLiveMedia(
                buffer,
                label,
                rootDir,
                'webm'
            );

        await this.attachAllure(
            `Video — ${label}`,
            buffer,
            'video/webm'
        );

        this.append({
            id: `video-${Date.now()}-${label}`,
            type: 'video',
            label,
            title: `Video — ${label}`,
            mediaUrl: saved.mediaUrl,
            ready: true
        });

        return saved;
    }
}

module.exports = EvidenceLogger;
