# Recurring Test Logic

The recurring test is a remediation flow designed to target specific performance gaps identified during a diagnostic assessment.

## 1. Trigger and Eligibility
A student becomes eligible for a recurring test if their overall readiness score is below 60%. The option appears on the results page after the initial test is completed.

## 2. Skill Identification
The system extracts two levels of failure data from the parent assessment:
- Broad Topics: Any topic marked as 'needs_teaching' or 'likely_weak'.
- Specific Skills: Any learning objective where the student scored below 60%.

## 3. Question Selection
The generator builds a custom question set based on the following rules:
- Targeting: Only questions matching the failed broad topics or specific learning objectives are considered.
- De-duplication: Any question ID that the student has already seen in previous sessions (including the parent test) is excluded from the candidate pool.
- Distribution: Questions are selected using a round-robin approach to ensure even coverage across all identified weak areas.

## 4. Test Scaling
The number of questions in the test is determined by the number of failed areas:
- 1 topic: 8 questions
- 2 topics: 10 questions
- 3 topics: 12 questions
- 4 topics: 14 questions
- 5+ topics: 16 questions

## 5. Persistence
The results are saved in the database with the mode set to 'recurring'. The session is linked to the original failed test via the parent_assessment_id column, allowing for longitudinal tracking of remediation progress.
