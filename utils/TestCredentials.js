class TestCredentials {

    static getUatUser() {

        return (
            process.env.UAT_USER
            || process.env.TEST_USER
            || 'sushant@unicommerce.com'
        );
    }

    static getUatPassword() {

        return (
            process.env.UAT_PASSWORD
            || process.env.TEST_PASSWORD
            || 'Newpass$123'
        );
    }
}

module.exports = TestCredentials;
