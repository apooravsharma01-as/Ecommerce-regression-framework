class FailureAnalyzer {
static detectFailureType(error = "") {

    if (error.includes("Timeout")) {
        return "Synchronization Failure";
    }

    if (error.includes("locator")) {
        return "Locator Failure";
    }

    if (error.includes("expect")) {
        return "Assertion Failure";
    }

    return "Unknown Failure";
}
static getRootCause(failureType) {

    const rootCauses = {

        "Synchronization Failure":
            "Element was not available before action execution.",

        "Locator Failure":
            "Locator may have changed or element is not present.",

        "Assertion Failure":
            "Expected and actual values do not match."

    };

    return rootCauses[failureType] ||
        "Unable to determine root cause.";
}
static getSuggestedFix(failureType) {

    const fixes = {

        "Synchronization Failure":
            "Use explicit waits or waitForLoadState before interaction.",

        "Locator Failure":
            "Use stable locators such as getByRole or data-testid.",

        "Assertion Failure":
            "Verify expected test data and actual application response."

    };

    return fixes[failureType] ||
        "Manual investigation required.";
}
static formatAnalysis(result) {

    return `
=========================
AI FAILURE ANALYSIS
=========================

Test Name:
${result.testName}

Failure Type:
${result.failureType}

Root Cause:
${result.rootCause}

Suggested Fix:
${result.suggestedFix}

Error:
${result.error}
`;
}

    static async analyze({
    testName,
    error,
    stackTrace
}) {

    const failureType =
        this.detectFailureType(error);

    const rootCause =
        this.getRootCause(failureType);

    const suggestedFix =
        this.getSuggestedFix(failureType);

    return {

        testName,

        failureType,

        rootCause,

        suggestedFix,

        error,

        stackTrace
    };
}
    }


module.exports = FailureAnalyzer;