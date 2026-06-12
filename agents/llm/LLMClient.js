require('dotenv').config();

const { GoogleGenerativeAI } =
    require('@google/generative-ai');

const DEFAULT_MODEL =
    process.env.GEMINI_MODEL
    || 'gemini-2.0-flash';

class LLMClient {

    static isAvailable() {

        return Boolean(
            process.env.GEMINI_API_KEY
        );
    }

    static getModel() {

        const genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY
        );

        return genAI.getGenerativeModel({
            model: DEFAULT_MODEL
        });
    }

    static async testConnection() {

        if (!this.isAvailable()) {
            throw new Error(
                'GEMINI_API_KEY is not configured'
            );
        }

        const model = this.getModel();

        const result =
            await model.generateContent(
                'Reply with only: Gemini Connection Successful'
            );

        return result.response.text();
    }

    static async generate(prompt) {

        if (!this.isAvailable()) {
            throw new Error(
                'GEMINI_API_KEY is not configured'
            );
        }

        const model = this.getModel();

        const result =
            await model.generateContent(prompt);

        return result.response.text();
    }
}

module.exports = LLMClient;
