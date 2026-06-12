require('dotenv').config();

const { Cursor } = require('@cursor/sdk');

(async () => {

    try {

        const models =
            await Cursor.models.list({
                apiKey:
                    process.env.CURSOR_API_KEY
            });

        console.dir(
            models,
            { depth: null }
        );

    } catch (error) {

        console.error(error);

    }

})();