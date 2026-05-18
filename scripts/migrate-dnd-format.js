const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// -----------------------------------------------------------------------
// DnD FORMAT MIGRATION SCRIPT
//
// Converts OLD drag_drop format to NEW format with zero data loss:
//   OLD: draggableItems[] + dropZones[] + answerKey[{item, target}]
//   NEW: items[{id,label}] + targets[{id,label}] + answerKey[{itemId,targetId}]
//
// Pure algorithmic conversion - NO LLM. Runs inside a transaction.
// -----------------------------------------------------------------------

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

function convertPayload(oldPayload) {
    const draggableItems = oldPayload.draggableItems; // ["$460", "$540", ...]
    const dropZones      = oldPayload.dropZones;      // ["Correct answer", "Not correct"]
    const oldAnswerKey   = oldPayload.answerKey;      // [{item: "$460", target: "Correct answer"}, ...]

    // Step 1: Build items[] with stable IDs
    const items = draggableItems.map((label, index) => ({
        id: `item_${index + 1}`,
        label: label
    }));

    // Step 2: Build targets[] with stable IDs
    const targets = dropZones.map((label, index) => ({
        id: `target_${index + 1}`,
        label: label
    }));

    // Step 3: Remap answerKey using text → ID lookup
    const answerKey = oldAnswerKey.map(entry => {
        const itemIndex   = draggableItems.indexOf(entry.item);
        const targetIndex = dropZones.indexOf(entry.target);

        if (itemIndex === -1 || targetIndex === -1) {
            throw new Error(
                `answerKey mismatch — item "${entry.item}" or target "${entry.target}" not found in arrays`
            );
        }

        return {
            itemId:   `item_${itemIndex + 1}`,
            targetId: `target_${targetIndex + 1}`
        };
    });

    // Step 4: Build new payload — keep all other keys (mode, labels, scoringGuidance, etc.)
    //         Remove old keys, add new ones
    const newPayload = { ...oldPayload };
    delete newPayload.draggableItems;
    delete newPayload.dropZones;

    newPayload.items     = items;
    newPayload.targets   = targets;
    newPayload.answerKey = answerKey;

    // Add mode if missing (old format never had it)
    if (!newPayload.mode) {
        newPayload.mode = 'classify';
    }

    return newPayload;
}

async function migrate() {
    const client = await pool.connect();

    try {
        // ---- STEP 1: Fetch all old-format rows ----
        console.log('🔍 Finding old-format drag_drop questions...');
        const res = await client.query(`
            SELECT id, generation_metadata
            FROM public.final_content_questions_1
            WHERE question_type = 'drag_drop'
              AND generation_metadata -> 'payload' ? 'draggableItems'
        `);

        const rows = res.rows;
        console.log(`Found ${rows.length} rows to migrate.\n`);
        if (rows.length === 0) {
            console.log('✅ Nothing to migrate. Already clean!');
            return;
        }

        // ---- STEP 2: Convert in-memory ----
        const updates = [];
        const errors  = [];

        for (const row of rows) {
            try {
                const meta = row.generation_metadata;
                const oldPayload = meta.payload;

                if (!oldPayload?.draggableItems || !oldPayload?.dropZones || !oldPayload?.answerKey) {
                    errors.push({ id: row.id, reason: 'Missing draggableItems, dropZones, or answerKey' });
                    continue;
                }

                const newPayload = convertPayload(oldPayload);
                const newMeta    = { ...meta, payload: newPayload };

                updates.push({ id: row.id, newMeta });
            } catch (err) {
                errors.push({ id: row.id, reason: err.message });
            }
        }

        console.log(`✅ Successfully converted: ${updates.length} rows`);
        console.log(`❌ Conversion errors:      ${errors.length} rows`);

        if (errors.length > 0) {
            console.log('\n⚠️  Rows with errors (will be SKIPPED):');
            errors.forEach(e => console.log(`   ${e.id}: ${e.reason}`));
        }

        if (updates.length === 0) {
            console.log('\n⛔ No valid updates to apply. Aborting.');
            return;
        }

        // ---- STEP 3: Apply updates inside a transaction ----
        console.log('\n🚀 Applying updates inside a transaction...');
        await client.query('BEGIN');

        for (const { id, newMeta } of updates) {
            await client.query(`
                UPDATE public.final_content_questions_1
                SET generation_metadata = $1::jsonb,
                    updated_at = NOW()
                WHERE id = $2
            `, [JSON.stringify(newMeta), id]);
        }

        await client.query('COMMIT');
        console.log(`\n🎉 Transaction committed! ${updates.length} rows migrated to new format.`);

        // ---- STEP 4: Verify ----
        console.log('\n🔍 Post-migration verification...');
        const verify = await client.query(`
            SELECT COUNT(*) as old_format_remaining
            FROM public.final_content_questions_1
            WHERE question_type = 'drag_drop'
              AND generation_metadata -> 'payload' ? 'draggableItems'
        `);
        console.log(`   Old format rows still remaining: ${verify.rows[0].old_format_remaining} (should be ${errors.length})`);

        const verifyNew = await client.query(`
            SELECT COUNT(*) as new_format_count
            FROM public.final_content_questions_1
            WHERE question_type = 'drag_drop'
              AND generation_metadata -> 'payload' ? 'items'
        `);
        console.log(`   New format rows total:           ${verifyNew.rows[0].new_format_count}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error! Transaction rolled back. Nothing was changed.', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
