const fs = require('fs');
const path = require('path');
const LLMClient =
    require('./LLMClient');
const PromptBuilder =
    require('./PromptBuilder');

class StoryParser {

    static loadImpactMap(rootDir) {

        const mapPath =
            path.join(
                rootDir,
                'config/impactMap.json'
            );

        return JSON.parse(
            fs.readFileSync(mapPath, 'utf8')
        );
    }

    static async parse({
        story,
        rootDir,
        useLlm = false
    }) {

        const impactMap =
            this.loadImpactMap(rootDir);

        const result = {
            story,
            normalizedStory: story,
            domains: [],
            summary: null,
            keywords: [],
            source: 'keyword-only',
            llmUsed: false
        };

        if (
            !useLlm
            || !LLMClient.isAvailable()
            || !story
        ) {
            return result;
        }

        try {

            const availableDomains =
                Object.entries(impactMap.domains)
                    .map(([id, domain]) => ({
                        id,
                        keywords: domain.keywords
                    }));

            const prompt =
                PromptBuilder.buildStoryParsingPrompt({
                    story,
                    availableDomains
                });

            const raw =
                await LLMClient.generate(prompt);

            const parsed =
                this.parseJsonResponse(raw);

            result.domains =
                (parsed.domains || [])
                    .filter(id =>
                        impactMap.domains[id]
                    );

            result.summary =
                parsed.summary || null;

            result.keywords =
                parsed.keywords || [];

            result.normalizedStory =
                parsed.summary
                    ? `${story}\n\nLLM summary: ${parsed.summary}`
                    : story;

            result.source = 'llm';
            result.llmUsed = true;

        } catch (error) {

            result.llmError = error.message;
        }

        return result;
    }

    static parseJsonResponse(raw) {

        const trimmed =
            raw.trim();

        const fenced =
            trimmed.match(
                /```(?:json)?\s*([\s\S]*?)```/
            );

        const jsonText =
            fenced
                ? fenced[1].trim()
                : trimmed;

        return JSON.parse(jsonText);
    }
}

module.exports = StoryParser;
