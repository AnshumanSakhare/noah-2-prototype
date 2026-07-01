# codingyoung backend (`noah-2-be`) — Conventions Reference

> Inferred from the diagnostic & placement test code (no written rules). This is the style the
> **homework feature must match exactly**. Two sources: the **hard rules** (tooling configs) and the
> **inferred idioms** (from `apps/diagnostic-test-agent`).

---

## 0. Stack correction (important — differs from the prototype)

The prototype repo (`diagnostic-agent-noah`) is **Next.js + raw `pg` + Zod v4**. codingyoung is **not**:

| | codingyoung `noah-2-be` |
|---|---|
| Runtime | **Express 4** (the package.json says "NestJS" but the code is Express + manual DI) |
| Language | TypeScript ESM (`"type":"module"`, `NodeNext`) — relative imports need the **`.js`** extension |
| DB | **Sequelize 6** models + **raw SQL** (`sequelize.query` with `bind`) for aggregates |
| Validation | **Zod v3** (not v4 — API differs from the prototype) |
| Monorepo | pnpm workspaces + Turborepo + changesets + husky + lint-staged |
| Tests | **Vitest** (unit/int/e2e) + supertest |

So homework code is **Express routers + Sequelize + Zod v3 + workspace packages** — not Next.js route handlers.

---

## 1. Hard rules (enforced by tooling — non-negotiable)

**Prettier** (`.prettierrc`): 120 print width · 2-space indent · **double quotes** · semicolons ·
`trailingComma: "all"` · `arrowParens: "always"` · `bracketSpacing: true` · LF.

**TypeScript** (`tsconfig.base.json`) — full strict + extras. The ones that will bite you:
- `noUncheckedIndexedAccess` → indexed/array/Map access is `T | undefined`. Hence the codebase does
  `const id = req.params["id"]` then validates, and guards `arr[i]` before use.
- `exactOptionalPropertyTypes` → you **cannot** pass `{ x: undefined }` to an optional `x?`. The
  codebase uses the spread idiom instead:
  ```ts
  service.latestPlacement({ studentId, ...(subjectId !== undefined ? { subjectId } : {}) });
  ```
- `noUnusedLocals` / `noUnusedParameters` / `noImplicitReturns` / `noFallthroughCasesInSwitch`.
- `declaration` + `declarationMap` (packages ship types).

**ESLint** (flat config + `boundaries`): cross-package import boundaries are enforced — respect the
package layering (app → packages, never sideways into another package's internals). `any` and
non-null `!` are only allowed in `*.test.ts`.

**Commits**: Conventional Commits (commitlint). Changes that touch published packages need a
**changeset**. husky + lint-staged run on commit.

---

## 2. Monorepo layout & where homework code goes

```
apps/diagnostic-test-agent/src/
  app.ts          # createApp(deps): mounts routers
  index.ts        # bootstrap: builds AppDeps once
  deps.ts         # AppDeps interface (config, logger, pgDb, mainDb, sso…)
  routes/         # *.ts  (kebab-case)         ← homework-sessions.ts
  services/       # *.service.ts (+ pure helpers: scoring.ts, seeded-shuffle.ts)
  repositories/   # *.repository.ts
  middleware/     # auth (cy-sso), validate, require-role, error, request-id
  bin/            # tsx CLI scripts
  jobs/, types/

packages/
  contracts/      # Zod schemas (source of truth)      ← schemas/homework-sessions.ts
  contract-types/ # type-only re-exports for FE
  db/             # Sequelize models + migrations       ← models/homework-session.ts, migrations/NNNN-*
  error/          # DomainError hierarchy
  logger/, observability/, auth/, config/, utils/, testing/
```

**Naming:** kebab-case files; `.service.ts` / `.repository.ts` suffixes; barrel `index.ts` per package;
migrations `NNNN-description.ts`.

---

## 3. The idioms to copy (with the canonical examples)

### 3.1 DI = manual closure wiring (no container)
`index.ts` builds `AppDeps` once → `createApp(deps)` → each router factory news up its own
repo+service over `deps`:
```ts
// app.ts
const repo = new TestSessionsRepository(deps.pgDb);
const service = new TestSessionsService(repo, /* … */);
app.use("/v1/test-sessions", createTestSessionsRouter(deps));
```
Homework: `createHomeworkSessionsRouter(deps)` mounted at `/v1/homework-sessions`.

### 3.2 Route handler shape (copy verbatim)
```ts
router.post(
  "/:id/attempts",
  auth, studentOnly,
  validate(SubmitAttemptRequestSchema, "body"),
  async (req, res, next) => {
    try {
      const id = parseId(req.params["id"]);
      const body = req.body as SubmitAttemptRequest;       // already parsed by validate()
      const studentId = requireStudentId(req);
      const result = await service.submitAttempt(id, body, { studentId });
      res.status(201).json(result);                        // 201 for creates, 200 for reads
    } catch (err) {
      next(err);                                            // ALL errors → global error middleware
    }
  },
);
```
Rules: middleware chain `auth → role → validate → handler`; **return the DTO directly** (no success
envelope); never build error responses in handlers; register literal paths before `/:id`.

### 3.3 Service = class + constructor injection + `toXDto` mappers
```ts
export class DiagnosticTestsService {
  constructor(private readonly repo: DiagnosticTestsRepository) {}
  async getById(id: number): Promise<DiagnosticTestDto> {
    const row = await this.repo.findById(id);
    if (row === null) throw new NotFoundError(`Diagnostic test ${id} not found`);
    return this.toWire(row);
  }
  private toWire(row: TestConfig): DiagnosticTestDto { /* Number(row.bigintField), … */ }
}
```
Rules: BIGINT → `Number(...)` at the DTO boundary; pure helpers (scoring, shuffle) as standalone
functions with module-level `UPPER_SNAKE` constants; comments cross-reference the vendor prototype.

### 3.4 Repository = Sequelize for CRUD, raw SQL for aggregates/atomics
```ts
// Sequelize
await TestConfig.findByPk(id);
// raw SQL with bind params (never string-interpolate user input)
await this.pg.query(`UPDATE test_session_questions SET status='read' WHERE id = (
  SELECT id FROM test_session_questions WHERE test_session_id = $1 AND status='pending'
  ORDER BY ordinal ASC LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING …`,
  { bind: [sessionId], type: QueryTypes.SELECT });
// multi-step writes in a transaction, commit/rollback
const tx = await this.pg.transaction(); try { …; await tx.commit(); } catch (e) { await tx.rollback(); throw e; }
```

### 3.5 Contracts = Zod v3, `FooSchema` + `type Foo = z.infer<…>`
```ts
export const SubmitAttemptRequestSchema = z.object({
  testSessionQuestionId: z.number().int().positive(),
  studentAnswer: z.string().max(4000).default(""),
  timeTakenMs: z.number().int().nonnegative().nullable().optional(),
});
export type SubmitAttemptRequest = z.infer<typeof SubmitAttemptRequestSchema>;
```
Discriminated unions for served shapes (`z.discriminatedUnion("kind", […])`). Request vs response
schemas separated. Barrel-export from `schemas/index.ts`; FE consumes **types only** from
`@noah-2/contract-types`.

### 3.6 Errors = throw `DomainError` subclasses; middleware maps them
`NotFoundError`(404) `ConflictError`(409) `ForbiddenError`(403) `UnauthenticatedError`(401)
`ValidationError`(400) `RateLimitError`(429). Error envelope is the **only** wrapped response:
```json
{ "error": { "code": "NOT_FOUND", "message": "…", "requestId": "…", "details": {…}? } }
```
ZodError → 400 `VALIDATION_FAILED` (with `.format()` details) automatically.

### 3.7 db models = class + attrs interface + `defineX(sequelize)`, snake_case via `field:`
```ts
export class TestSession extends Model<Attrs, CreationAttrs> implements Attrs {
  declare id: number; declare studentId: string; declare completedAt: Date | null;
}
export function defineTestSession(s: Sequelize) {
  TestSession.init({ id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    studentId: { type: DataTypes.STRING(60), allowNull: false, field: "student_id" } },
    { sequelize: s, tableName: "test_sessions", timestamps: true });
  return TestSession;
}
```
Register in `models/index.ts`; associations after all models defined.

### 3.8 Logging = winston, structured key-value, always `requestId`
`logger.info("listening", { port })`, `logger.error("unhandled_exception", { requestId: req.id, … })`.

### 3.9 Tests = Vitest, `fakeRow()` + `makeService()` fixtures, `vi.fn()` repo mocks
`*.service.test.ts` mocks the repo; `*.repository.test.ts` asserts SQL + `bind` params. Co-located
with the code.

---

## 4. Null vs undefined / type conventions
- **null** for DB-nullable values (`completedAt: Date | null`); **undefined** for optional params.
- `import type { … }` for type-only imports; runtime imports separate.
- `private readonly` fields; PascalCase classes/types/interfaces; camelCase functions/vars;
  UPPER_SNAKE module constants.
- `interface` for object/class contracts; `type` for unions & DTO aliases.

---

## 5. Homework feature — convention checklist (apply 1:1)

- [ ] Express router `createHomeworkSessionsRouter(deps)` → mount `/v1/homework-sessions` in `app.ts`.
- [ ] `homework-sessions.service.ts` (class, ctor-injected repo) + `homework-materialiser.ts` +
      `homework-scoring.ts` (pure) + `homework-hydrate.ts` (pure).
- [ ] `homework.repository.ts` — Sequelize for CRUD, raw SQL (`bind`, `FOR UPDATE SKIP LOCKED`) for
      dequeue, transaction for attempt+rollups.
- [ ] Zod v3 schemas in `packages/contracts/src/schemas/homework-sessions.ts` (+ barrel + types).
- [ ] `homework_sessions` Sequelize model + `NNNN-homework.ts` migration; `field:` snake_case mapping.
- [ ] Handlers: `try/catch → next(err)`, DTO-direct responses, 201 on start/attempt, 200 elsewhere.
- [ ] Throw `DomainError` subclasses; no ad-hoc `{ success, error }`.
- [ ] Respect `exactOptionalPropertyTypes` (spread-conditional for optionals) and
      `noUncheckedIndexedAccess` (guard indexed access).
- [ ] BIGINT → `Number()` at DTO boundary; `import type`; `.js` on relative imports.
- [ ] Vitest tests: `*.service.test.ts` (mock repo) + `*.repository.test.ts` (assert SQL/bind).
- [ ] Conventional-commit messages; changeset if `packages/contracts` or `packages/db` change.

---

## 6. Open style questions (low-risk, confirm during impl)
1. Does homework belong in `apps/diagnostic-test-agent` (recommended — shares deps/models) or a new app?
2. Reuse `attempts` + `test_session_questions` tables for homework, or homework-specific tables?
   (Ties to the persistence decision in the integration plan.)
3. Is there an existing `interactive-question-mix.ts` / `seeded-shuffle.ts` we should reuse for the
   15+5 blueprint instead of porting the prototype's `Math.random()` selection? (Spotted in services/ —
   worth checking before porting.)
```
