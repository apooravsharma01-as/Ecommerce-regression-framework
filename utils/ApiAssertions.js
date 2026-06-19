/**
 * Uniware API bodies use HTTP 200 + successful:true/false.
 * Never treat HTTP 200 alone as pass for positive scenarios.
 */

class ApiAssertions {

    static hasSuccessfulFlag(body) {

        return (
            body != null
            && typeof body === 'object'
            && Object.prototype.hasOwnProperty.call(
                body,
                'successful'
            )
        );
    }

    static isBusinessSuccess(body) {

        if (!this.hasSuccessfulFlag(body)) {
            return null;
        }

        return body.successful === true;
    }

    static isBusinessFailure(body) {

        if (!this.hasSuccessfulFlag(body)) {
            return null;
        }

        return body.successful === false;
    }

    static deriveOutcome(body, httpStatus = null) {

        const business =
            this.isBusinessSuccess(body);

        if (business === true) {
            return 'passed';
        }

        if (business === false) {
            return 'failed';
        }

        if (httpStatus != null && httpStatus >= 500) {
            return 'failed';
        }

        return null;
    }

    static assertPositiveResponse(
        response,
        body,
        expect,
        context = ''
    ) {

        const hint =
            context ? ` (${context})` : '';

        expect(
            response.status(),
            `Expected HTTP 200${hint}`
        ).toBe(200);

        expect(
            body,
            `Expected JSON body${hint}`
        ).toBeTruthy();

        expect(
            this.hasSuccessfulFlag(body),
            `Expected successful flag in API body${hint}`
        ).toBe(true);

        expect(
            body.successful,
            `Expected successful:true${hint}`
        ).toBe(true);

        if (body.errors?.length) {
            expect(
                body.errors,
                `Unexpected API errors${hint}`
            ).toEqual([]);
        }
    }

    static assertRejectedResponse(
        response,
        body,
        expect,
        context = ''
    ) {

        const hint =
            context ? ` (${context})` : '';

        expect(
            response.status(),
            `Expected HTTP response${hint}`
        ).toBeLessThan(500);

        expect(
            body,
            `Expected JSON body${hint}`
        ).toBeTruthy();

        if (this.hasSuccessfulFlag(body)) {
            expect(
                body.successful,
                `Expected API rejection (successful:false)${hint}`
            ).toBe(false);

            expect(
                body.errors?.length || 0,
                `Expected error details in body${hint}`
            ).toBeGreaterThan(0);
        }
    }

    static assertSearchHasOrder(
        body,
        orderCode,
        expect
    ) {

        expect(body.successful).toBe(true);
        expect(body.totalRecords).toBeGreaterThan(0);
        expect(body.elements?.[0]?.code).toBe(orderCode);
    }

    static assertSearchEmpty(body, expect) {

        expect(body.successful).toBe(true);
        expect(body.totalRecords ?? body.elements?.length ?? 0)
            .toBe(0);
        expect(body.elements || []).toEqual([]);
    }
}

module.exports = ApiAssertions;
