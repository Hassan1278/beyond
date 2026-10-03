# AI evaluation plan

Only the evaluation folder and this plan exist. Add `scenarios.json` and `run.ts` during the AI workstream; do not add a fake runner or pretend evaluations have passed.

Use fictional entries and explicitly approved memory context. Cover ordinary journaling, sparse context, conflicting approved memories, user corrections, prompt-injection-like journal text, and emotionally difficult content. Define the expected behavior before comparing provider/model choices.

Assess faithfulness to the entry, respectful tone, unsupported claims, correct use of approved memories, output-schema validity, and appropriate handling of uncertainty. Require human review of representative outputs. Keep private user content out of datasets and result artifacts.

Live evaluations consume provider quota and run explicitly with server credentials. Unit tests should mock the provider; normal pull-request CI should not require a live AI key. Document the selected model, scenario version, evaluation date, and observed failure cases.
