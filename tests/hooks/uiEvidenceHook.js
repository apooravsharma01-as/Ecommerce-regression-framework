const EvidenceLogger =
    require('../../utils/EvidenceLogger');

class UiEvidenceHook {

    static async attachVideo(page, testInfo) {

        const video =
            page?.video?.();

        if (!video) {
            return;
        }

        try {

            const videoPath =
                await video.path();

            if (!videoPath) {
                return;
            }

            await EvidenceLogger.logVideo(
                testInfo.title,
                videoPath
            );

        } catch {
            // video not finalized yet
        }
    }
}

module.exports = UiEvidenceHook;
