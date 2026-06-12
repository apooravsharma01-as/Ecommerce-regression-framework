require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

class LLMClient {

    static async testConnection() {

        const genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY
        );

        const model = genAI.getGenerativeModel({
           model: 'gemini-1.5-flash-latest'
        });

        const result = await model.generateContent(
            'Reply with only: Gemini Connection Successful'
        );

        return result.response.text();
    }
    static async generate(prompt) {

    const genAI = new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY
    );

    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest'
    });

    const result =
        await model.generateContent(prompt);

    return result.response.text();
}
}

module.exports = LLMClient;