const EvidenceLogger =
    require('../../utils/EvidenceLogger');

class EvidenceContextHook {

    static bind(testInfo) {

        EvidenceLogger.setContext({
            testName: testInfo.title,
            testFile: testInfo.file,
            suite: testInfo.parent?.title || null
        });
    }
}

module.exports = EvidenceContextHook;
