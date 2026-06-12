require('dotenv').config();

class AuthHelper {

    static getCredentials() {

        return {
            username:
                process.env.TEST_USERNAME
                || 'sushant@unicommerce.com',

            password:
                process.env.TEST_PASSWORD
                || 'Newpass$123',

            baseUrl:
                process.env.BASE_URL
                || 'https://stguat.unicommerce.info',

            clientId:
                process.env.OAUTH_CLIENT_ID
                || 'uniware-internal-client'
        };
    }

    static async getAccessToken(request) {

        const {
            username,
            password,
            baseUrl,
            clientId
        } = this.getCredentials();

        const response =
            await request.get(
                `${baseUrl}/oauth/token`,
                {
                    params: {
                        grant_type: 'password',
                        client_id: clientId,
                        username,
                        password
                    }
                }
            );

        if (!response.ok()) {

            const body =
                await response.text();

            throw new Error(
                `OAuth failed (${response.status()}): ${body}`
            );
        }

        const body =
            await response.json();

        return body.access_token;
    }

    static authHeaders(accessToken) {

        return {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${accessToken}`
        };
    }
}

module.exports = AuthHelper;
