class LoginPage {

    constructor(page) {
        this.page = page;

        this.usernameInput = page.locator('#username');
        this.passwordInput = page.locator('#password');
        this.loginButton = page.locator('.loginButton');

        this.stguatOption =
            page.locator('.accountRow[account-code="stguat"]');
    }

    async navigate() {

        await this.page.goto(
            'https://stgauth.unicommerce.com/login',
            {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            }
        );

        await this.usernameInput.waitFor({
            state: 'visible',
            timeout: 90000
        });
    }

    async login(username, password) {

        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
    }

    async selectOrganization() {

        await this.stguatOption.waitFor({
            state: 'visible',
            timeout: 60000
        });

        await this.stguatOption.click();
    }
}

module.exports = { LoginPage };
