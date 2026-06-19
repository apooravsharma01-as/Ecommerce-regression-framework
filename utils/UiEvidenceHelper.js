class UiEvidenceHelper {

    static encodeMediaPath(basePath, filePath) {

        const encoded =
            String(filePath)
                .split('/')
                .map(segment =>
                    encodeURIComponent(segment)
                )
                .join('/');

        return `${basePath}/${encoded}`;
    }

    static async setViewport(page) {

        await page.setViewportSize({
            width: 1920,
            height: 1080
        });
    }

    static findAppFrame(page) {

        const frames = page.frames();

        return frames.find(frame => {

            const url =
                frame.url() || '';

            return (
                url.includes('stguat.unicommerce.info')
                && !url.includes('about:blank')
                && frame.parentFrame() !== null
            );
        });
    }

    static async waitForAppReady(page, timeout = 60000) {

        await page.waitForLoadState(
            'domcontentloaded',
            { timeout }
        );

        await page.waitForSelector(
            '#ngframe, .main-content, #main-content, body',
            { state: 'visible', timeout }
        );

        const ngFrame =
            page.locator('#ngframe');

        if (await ngFrame.count() > 0) {

            await ngFrame.waitFor({
                state: 'visible',
                timeout
            });

            const appFrame =
                this.findAppFrame(page);

            if (appFrame) {
                await appFrame
                    .waitForLoadState('domcontentloaded')
                    .catch(() => {});
            } else {
                try {
                    await page
                        .frameLocator('#ngframe')
                        .locator('body')
                        .waitFor({
                            state: 'visible',
                            timeout: 30000
                        });
                } catch {
                    // continue
                }
            }

            await page.waitForTimeout(2000);
            return;
        }

        await page.waitForLoadState('networkidle', {
            timeout: 15000
        }).catch(() => {});
    }

    static async captureScreenshot(page, options = {}) {

        await this.waitForAppReady(page);

        const appFrame =
            this.findAppFrame(page);

        if (appFrame) {
            try {
                return await appFrame.screenshot({
                    animations: 'disabled',
                    ...options
                });
            } catch {
                // fall through
            }
        }

        const ngFrame =
            page.locator('#ngframe');

        if (await ngFrame.count() > 0) {
            try {
                return await ngFrame.screenshot({
                    animations: 'disabled',
                    ...options
                });
            } catch {
                // fall through
            }
        }

        return page.screenshot({
            fullPage: false,
            animations: 'disabled',
            ...options
        });
    }

    static async captureStep(
        page,
        EvidenceLogger,
        label
    ) {

        const buffer =
            await this.captureScreenshot(page);

        await EvidenceLogger.logScreenshot(
            label,
            buffer
        );

        return buffer;
    }
}

module.exports = UiEvidenceHelper;
