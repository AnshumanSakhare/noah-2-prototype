# Question Serving Logic

This document explains, in simple language, how the diagnostic app chooses questions, learning objectives, and difficulty levels.

## Short Answer

The app does not randomly pick questions one by one.

It first finds all questions that match the selected subject, class, and topic. Then it tries to build a balanced test using:

- learning objective coverage
- difficulty balance
- question type variety
- available questions in the database

If the perfect balance is not possible because the database does not have enough questions, the app fills the remaining slots with the best available questions.

## Topic Test

A topic test serves up to **12 questions**.

The target difficulty split is:

- **4 easy**
- **4 medium**
- **4 hard**

So the intended ratio is:

**Easy : Medium : Hard = 1 : 1 : 1**

> [!NOTE]
> **Recent Update:** Previously, topic test size scaled linearly with the number of unique learning objectives in the database (Unique LOs × 3, up to 18). Because some topics have a very high count of unique, granular learning objectives in the database (e.g., 26 or 351 LOs), the test size exploded up to 373 questions. 
> We introduced a strict cap of **12 questions** and decoupled the difficulty targets to ensure a perfectly balanced 4/4/4 split regardless of how many unique learning objectives exist.

### How Learning Objectives Are Selected

The learning objectives are not selected separately by the user.

They come from the questions available for the selected topic.

For example, if the selected topic has questions from 5 learning objectives, the app tries to spread questions across those objectives.

It uses a round-robin style:

1. Pick one question from learning objective A.
2. Pick one question from learning objective B.
3. Pick one question from learning objective C.
4. Continue cycling through the learning objectives.

This prevents the test from asking too many questions from only one learning objective.

### Interactive Question Target

The app tries to include interactive questions such as:

- fill in the blank
- drag and drop

The target is around **one-third of the test**.

For an 18-question topic test, that means the app tries to include around **6 interactive questions**, if enough are available.

### What Happens If Questions Are Missing

If the app cannot find enough questions for a difficulty level or learning objective, it does not fail immediately.

Instead, it fills the remaining slots using available questions from other difficulty levels or objectives.

Example:

If the app wants 6 hard questions but only 4 hard questions exist, it will use those 4 and fill the remaining 2 slots from other available questions.

## Grade Test

A grade test serves up to **22 questions**.

The target difficulty split is:

- **5 easy**
- **7 medium**
- **10 hard**

So the grade test is slightly more challenge-heavy than the topic test.

Instead of balancing mainly by learning objective, the grade test balances more by **topic**, because it is checking the broader class-level syllabus.

## Final Question Order

After the questions are selected, the app mixes question types.

This is done so the student does not see many questions of the same format one after another.

For example, it tries to avoid a sequence like:

- MCQ
- MCQ
- MCQ
- MCQ

Instead, it tries to mix formats like:

- MCQ
- fill in the blank
- drag and drop
- MCQ
- short answer

## In Plain Language

The app is trying to create a fair diagnostic test.

For a topic test, it wants:

- 18 questions
- equal easy, medium, and hard coverage
- questions spread across learning objectives
- some interactive questions
- mixed question formats

For a grade test, it wants:

- 22 questions
- more hard questions than easy questions
- questions spread across topics
- some interactive questions
- mixed question formats

The final test depends on what questions actually exist in the database.

## Source References

- Topic test question count: `lib/quiz-counts.ts`
- Grade test question count: `lib/quiz-counts.ts`
- Topic difficulty target: `agents/diagnostic/tools/contentQuiz.ts`
- Grade difficulty target: `agents/diagnostic/tools/contentQuiz.ts`
- Learning objective round-robin selection: `agents/diagnostic/tools/contentQuiz.ts`
- Question type mixing: `agents/diagnostic/tools/contentQuiz.ts`
