const path = require('path');
const { Pool } = require('pg');
const OpenAI = require('openai');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// --- CONFIGURATION ---
const IS_TESTING_MODE = true; // ⚠️ Set to true to test 5 rows. Set to false for full 11k run.
const BATCH_SIZE = 10;        // Questions per AI prompt
const CONCURRENCY_LIMIT = 5;  // Parallel AI requests at a time
const MAX_RETRIES = 3;        // How many times to retry a failed API call

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    max: 20 
});

// Helper for timestamped logs
const log = (msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`);
const logError = (msg) => console.error(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ❌ ${msg}`);

async function runAIFixer() {
    log("🚀 Starting Production AI Fixer for MCQ Options...");

    try {
        // 1. Fetch exactly the broken rows
        const dbRes = await pool.query(`
            SELECT id, region, question_text, options, explanation 
            FROM public.final_content_questions_1_backup
            WHERE question_type = 'mcq'
              AND jsonb_typeof(options) = 'array'
              AND jsonb_typeof(options->0) = 'string'
        `);

        let brokenQuestions = dbRes.rows;
        log(`📊 Found ${brokenQuestions.length} broken questions in the database.`);

        if (brokenQuestions.length === 0) {
            log("No broken questions found. Exiting.");
            return;
        }

        // --- TESTING MODE INTERVENTION ---
        if (IS_TESTING_MODE) {
            brokenQuestions = brokenQuestions.slice(0, 5);
            log(`\n🛠️ TESTING MODE ACTIVE: Sliced array to only process ${brokenQuestions.length} entries.`);
        }

        // 2. Chunk into batches of 10
        const batches = [];
        for (let i = 0; i < brokenQuestions.length; i += BATCH_SIZE) {
            batches.push(brokenQuestions.slice(i, i + BATCH_SIZE));
        }

        // 3. Process with Concurrency Limit
        let totalFixed = 0;
        
        for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
            const currentChunks = batches.slice(i, i + CONCURRENCY_LIMIT);
            
            // Run batches in parallel
            const results = await Promise.all(
                currentChunks.map((batch, index) => processBatchWithRetry(batch, i + index + 1))
            );

            // 4. Validate and Build Bulk Update
            const validUpdates = [];
            for (const batchResult of results) {
                if (!batchResult || !batchResult.fixed_questions) continue;

                for (const fixedItem of batchResult.fixed_questions) {
                    // Manual Schema Validation Check before hitting DB
                    if (Array.isArray(fixedItem.fixed_options) && 
                        fixedItem.fixed_options.length > 0 && 
                        typeof fixedItem.fixed_options[0].correct === 'boolean') {
                        validUpdates.push(fixedItem);
                    } else {
                        logError(`Validation failed for ID: ${fixedItem.id}. Skipping.`);
                    }
                }
            }

            // --- TESTING MODE OUTPUT ---
            if (IS_TESTING_MODE && validUpdates.length > 0) {
                log(`\n🔍 --- TEST MODE: INSPECTING FIRST RESULT ---`);
                console.dir(validUpdates[0], { depth: null, colors: true });
                log(`----------------------------------------------\n`);
            }

            // 5. Bulk Update Database
            if (validUpdates.length > 0) {
                const values = [];
                const valueStrings = [];
                let varIndex = 1;

                for (const item of validUpdates) {
                    valueStrings.push(`($${varIndex++}::uuid, $${varIndex++}::jsonb)`);
                    values.push(item.id, JSON.stringify(item.fixed_options));
                }

                await pool.query(`
                    UPDATE public.final_content_questions_1_backup AS t
                    SET options = c.options
                    FROM (VALUES ${valueStrings.join(', ')}) AS c(id, options)
                    WHERE t.id = c.id
                `, values);

                totalFixed += validUpdates.length;
                log(`✅ Saved ${validUpdates.length} fixed questions to DB. (Total Progress: ${totalFixed}/${brokenQuestions.length})`);
            }
        }

        if (IS_TESTING_MODE) {
            log(`\n🛑 TEST COMPLETE. If the JSON structure above looks correct, change IS_TESTING_MODE to false and run again.`);
        } else {
            log(`\n🎉 COMPLETION SUMMARY: Successfully repaired ${totalFixed} out of ${brokenQuestions.length} questions.`);
        }

    } catch (err) {
        logError(`FATAL SCRIPT ERROR: ${err.message}`);
    } finally {
        await pool.end();
    }
}

// Wrapper to handle retries and exponential backoff
async function processBatchWithRetry(batch, batchNumber, attempt = 1) {
    try {
        return await callOpenAI(batch);
    } catch (error) {
        if (attempt <= MAX_RETRIES) {
            const delay = attempt * 2000; // 2s, 4s, 6s backoff
            logError(`Batch ${batchNumber} failed (Attempt ${attempt}/${MAX_RETRIES}). Error: ${error.message}. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            return await processBatchWithRetry(batch, batchNumber, attempt + 1);
        } else {
            logError(`🚨 Batch ${batchNumber} permanently failed after ${MAX_RETRIES} attempts.`);
            return null; 
        }
    }
}

// Core OpenAI Call using Structured Outputs (Strict Mode)
async function callOpenAI(batch) {
    const promptQuestions = batch.map(q => ({
        id: q.id,
        region: q.region, 
        question: q.question_text,
        flat_options: q.options, 
        explanation: q.explanation 
    }));

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", 
        messages: [
            { 
                role: "system", 
                content: `You are a precision Data Fixer for an EdTech database. You will receive multiple-choice questions where the 'options' are currently a flat array of strings.
                
                YOUR MISSION:
                1. Read the 'explanation' to determine exactly which one of the flat options is the correct answer.
                2. Rebuild the options array into objects: {"text": "exact string", "correct": true/false}.
                
                STRICT RULES:
                - REGIONAL INTEGRITY: These are regional questions (UK, UAE, Ontario, etc.). DO NOT change the spelling, currency, or units of the option text. Copy the text EXACTLY as it appears in the 'flat_options' array.
                - Only ONE option should be "correct": true.
                - You must return the exact same number of options that were provided.`
            },
            { 
                role: "user", 
                content: JSON.stringify(promptQuestions) 
            }
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "fixed_mcq_schema",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        fixed_questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    fixed_options: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                text: { type: "string" },
                                                correct: { type: "boolean" }
                                            },
                                            required: ["text", "correct"],
                                            additionalProperties: false
                                        }
                                    }
                                },
                                required: ["id", "fixed_options"],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ["fixed_questions"],
                    additionalProperties: false
                }
            }
        }
    });

    return JSON.parse(response.choices[0].message.content);
}

runAIFixer();