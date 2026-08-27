# Contributing to AquaVeda v2

Welcome to AquaVeda v2.

This repository is being developed as a deliberate reconstruction of the original AquaVeda project. We use GitHub Issues and Pull Requests as the shared source of truth for implementation work so that contributors can work independently without requiring a separate explanation of the project every time someone joins.

You do **not** need to know advanced Git to contribute. If you can clone a repository, create a branch, make changes, commit them, and push the branch, you have enough to start.

If you are using an LLM/AI coding assistant, you can give it this file together with the issue you are working on and ask it to explain the workflow before making changes.

---

## 1. The Basic Rule

**Do not work directly on `main`.**

The normal workflow is:

```text
GitHub Issue
    ↓
Understand the task
    ↓
Create a branch
    ↓
Make focused changes
    ↓
Run checks
    ↓
Commit
    ↓
Push branch
    ↓
Open Pull Request
    ↓
Review
    ↓
Fix review comments if needed
    ↓
Merge
```

`main` should remain stable and deployable.

---

## 2. Before You Start

### Read the Issue first

Every contributor should begin with the GitHub Issue assigned to them.

The issue is the task boundary. Do not silently expand the scope because you noticed three other things that could theoretically be improved. That is how a 30-minute frontend issue becomes a 400-line refactor nobody asked for.

Before coding, identify:

- What the issue is asking for.
- What is explicitly **in scope**.
- What is explicitly **out of scope**.
- The acceptance criteria.
- Relevant references to documentation or other issues.
- Any unresolved architectural questions.

If the issue is a design/planning issue, **do not jump directly into implementation**. Produce the requested plan/proposal first and let it be reviewed.

---

## 3. Read the Project Context

You do not need to read the entire repository before every issue, but you should know where the important decisions live.

Recommended order:

1. `README.md` — project overview and setup.
2. `docs/vision/product-invariants.md` — rules that should not be violated by implementation.
3. `docs/vision/vision.md` — product direction.
4. `docs/vision/principles.md` — design/engineering philosophy.
5. `docs/domain/domain-model.md` — domain concepts and lifecycle rules.
6. `docs/domain/decision-register.md` — cumulative record of important decisions.
7. `docs/architecture/` — architecture-specific decisions.
8. `docs/adr/` — why significant architectural decisions were made.
9. `docs/engineering/standards.md` — coding rules, commits, branching, and Definition of Done.
10. The specific files referenced by your GitHub Issue.

For frontend work, pay particular attention to the Server Component / Client Component boundary and existing design-system primitives.

For backend work, do not invent domain behavior that has not been decided in the domain documentation.

---

## 4. Git: The Only Commands You Need Initially

You will commonly use these commands:

```bash
git status
git pull
git switch -c feature/my-change
git add .
git commit -m "feat(scope): describe the change"
git push -u origin feature/my-change
```

### What they mean

#### Check what changed

```bash
git status
```

Use this constantly. Git is considerably less mysterious when you actually ask it what is happening.

#### Get the latest `main`

```bash
git switch main
git pull origin main
```

#### Create a new branch

```bash
git switch -c feature/explore-filter-panel
```

Use a short, descriptive branch name.

Examples:

```text
feature/explore-filter-panel
feature/auth-login-ui
fix/mobile-navigation
refactor/api-client
perf/dashboard-prefetch
```

#### Stage changes

```bash
git add .
```

Before committing, check `git status` again. Do not blindly stage files you did not intend to change.

For more control:

```bash
git add path/to/file.tsx
```

#### Commit

```bash
git commit -m "feat(explore): add filter panel"
```

Use the project's Conventional Commit format:

```text
type(scope): summary
```

Common types:

```text
feat
fix
docs
style
refactor
perf
test
build
ci
chore
```

#### Push your branch

```bash
git push -u origin feature/explore-filter-panel
```

After the first push, future pushes can usually be:

```bash
git push
```

---

## 5. Recommended Branch Workflow

Start every issue from an up-to-date `main`.

```bash
git switch main
git pull origin main
git switch -c feature/short-description
```

Then work normally:

```bash
git status
# edit files
npm run typecheck
npm run lint
git status
git add .
git commit -m "feat(scope): implement the change"
git push -u origin feature/short-description
```

Open a Pull Request from your branch into `main`.

### Do not do this

```bash
git push origin main
```

Do not force-push shared branches either:

```bash
git push --force
```

If Git is asking you to force-push, stop and ask for help instead of treating Git's warning as a side quest.

---

## 6. Pull Requests

Every implementation issue should normally result in a Pull Request.

A good PR should make it easy for a reviewer to answer:

1. What issue does this solve?
2. What changed?
3. Why was it implemented this way?
4. How was it tested?
5. Did anything remain intentionally unresolved?
6. Did the implementation stay within the issue scope?

### PR title

Prefer the same Conventional Commit style:

```text
feat(explore): establish issue filter architecture
fix(auth): handle expired session state
refactor(ui): extract shared filter primitives
```

### PR description

At minimum include:

```markdown
## Summary
- What changed?

## Related Issue
Closes #123

## Testing
- `npm run typecheck`
- `npm run lint`
- Manual verification of ...

## Notes
- Important implementation decisions
- Known limitations
- Anything intentionally deferred
```

Keep the PR focused. One coherent issue is better than one heroic PR containing an unrelated redesign, three refactors, and the contributor's personal vendetta against semicolons.

---

## 7. Review Process

PRs are reviewed before merging.

Reviewers may check:

- Issue acceptance criteria.
- Product behavior.
- Architecture and domain boundaries.
- Code quality.
- Type safety.
- Accessibility.
- Responsive behavior.
- Error/loading/empty states.
- Tests and validation.
- Documentation.
- Scope discipline.
- Performance where relevant.

A review comment is not automatically a rejection of the whole PR. Address the requested change, push another commit, and the PR will update automatically.

If you disagree with a review comment, explain the technical reasoning in the PR rather than silently ignoring it.

---

## 8. Keeping Your Branch Up to Date

If `main` changes while you are working, you may need to update your branch.

The simplest approach for newer contributors is:

```bash
git fetch origin
git switch main
git pull origin main
git switch feature/your-branch
```

Then, if the branch needs the latest `main`, use the repository's preferred integration method. If you have not used rebase before, **do not improvise**. Ask the reviewer or an LLM to walk you through the exact commands for your branch.

When resolving merge conflicts, do not blindly accept "ours" or "theirs". Read the conflict and understand which behavior should survive.

After resolving conflicts:

```bash
git status
```

Then run the relevant checks again before pushing.

---

## 9. Working With an Issue

### If the issue is an implementation issue

Follow this pattern:

```text
Read issue
  ↓
Inspect existing code
  ↓
Read referenced architecture/domain docs
  ↓
Implement the smallest correct solution
  ↓
Test it
  ↓
Self-review the diff
  ↓
Open PR
```

### If the issue is a planning/design issue

Do not implement the feature immediately.

Instead:

```text
Read issue
  ↓
Inspect current architecture
  ↓
Research relevant constraints
  ↓
Write proposal/plan
  ↓
Open PR
  ↓
Review
  ↓
Implementation issues are created after approval
```

This repository deliberately uses planning issues as architecture gates. Respect them.

---

## 10. Do Not Invent Missing Requirements

This is one of the most important project rules.

If the repository says something is unresolved, leave it unresolved until the appropriate design discussion resolves it.

For example, the Issue lifecycle contains an unresolved authorization dependency for remediation transitions. Do **not** invent:

- a new role,
- an assignment model,
- Project membership authority,
- a new permission system,
- or another convenient authorization shortcut

just to make the code compile.

Instead:

1. Identify the dependency.
2. Document it in the PR.
3. Reference the relevant issue/decision.
4. Ask for clarification if the issue cannot be completed safely without a decision.

An explicit unresolved requirement is safer than a plausible invention.

---

## 11. Frontend Contribution Rules

AquaVeda v2 uses Next.js App Router.

### Server Components by default

Use Server Components unless the component genuinely needs:

- browser APIs,
- React state,
- event handlers,
- or another client-only capability.

When `"use client"` is required, keep the boundary as deep and small as practical.

### Use existing UI primitives

Before creating a new Button, Card, Input, Badge, Dialog, or similar primitive, check whether an existing shared component already solves the problem.

Do not create duplicate design systems inside feature folders.

### Respect the design system

Use the existing semantic tokens, spacing rhythm, typography, and interaction patterns. A new feature should look like part of AquaVeda, not like a component escaped from a different website.

### Handle real states

Interactive UI should consider, where applicable:

- loading
- empty
- error
- success
- disabled
- pending
- responsive layouts
- keyboard interaction
- visible focus
- reduced motion

### Do not over-engineer

Do not add a large library, state-management system, abstraction layer, or generic framework because it might be useful someday.

There should be a concrete current requirement.

---

## 12. Backend Contribution Rules

The backend is a separate Express service in the same repository.

Keep these boundaries clear:

```text
Route / Controller
        ↓
Validation
        ↓
Domain Service
        ↓
Persistence / Model
```

Authentication details should not leak into domain services. Services should operate on resolved actor context rather than decoding tokens themselves.

Do not move domain rules into controllers simply because the controller is convenient.

Do not make MongoDB schema decisions that contradict the domain model without first revisiting the relevant architectural decision.

---

## 13. Testing and Verification

Before opening a PR, run the checks relevant to your changes.

For frontend changes, at minimum:

```bash
npm run typecheck
npm run lint
```

If tests exist for the affected area, run them too.

For backend changes, use the server's documented commands and run the relevant tests/verification scripts.

If you cannot run a check, state that clearly in the PR instead of claiming it passed.

### Manual testing matters

For UI work, test the actual user flow, not just whether the page compiles.

Check at least:

- normal desktop width
- narrow/mobile width
- keyboard interaction where relevant
- loading/error/empty states
- browser console for unexpected errors

The project's Definition of Done also requires functionality, responsiveness, accessibility, typing, testing, self-review, and documentation. See `docs/engineering/standards.md`.

---

## 14. Documentation Rules

When your work changes a durable project decision or documented behavior, update the appropriate documentation.

Use:

- `docs/vision/` for product vision and principles.
- `docs/domain/` for domain concepts and cumulative decisions.
- `docs/architecture/` for broader architectural patterns.
- `docs/adr/` for significant durable architectural decisions.
- `docs/engineering/` for engineering workflow and standards.

Do not create a new document when an existing source of truth already covers the topic.

If a decision is genuinely architectural and durable, it should not live only in a PR comment where future contributors will never find it.

---

## 15. If You Are New to Git

You only need to understand this mental model:

```text
Your computer
    │
    │ commit
    ▼
Your local branch
    │
    │ push
    ▼
GitHub branch
    │
    │ Pull Request
    ▼
main
```

A commit is a saved checkpoint in your local Git history.

A branch is your isolated line of work.

A push sends your commits to GitHub.

A Pull Request asks the project to review and merge your branch into `main`.

You are not expected to become a Git expert before contributing. Learn the commands you actually need and avoid destructive commands until you understand them.

### Useful recovery commands

See recent commits:

```bash
git log --oneline --decorate -10
```

See exactly what you changed:

```bash
git diff
```

See staged changes:

```bash
git diff --cached
```

See branches:

```bash
git branch
```

If something looks wrong, **stop before running reset, clean, rebase, or force-push commands**. Those commands can destroy work when used incorrectly.

---

## 16. Using an LLM to Contribute

AI coding assistants are allowed and can be useful, but they are not the project's source of truth.

If you use one, give it:

1. This `CONTRIBUTING.md`.
2. The GitHub Issue.
3. Relevant files referenced by the issue.
4. Relevant architecture/domain documentation.

A useful prompt is:

```text
Read CONTRIBUTING.md first and follow the repository workflow.

Then read GitHub Issue #123 and summarize:
- what is required
- what is out of scope
- relevant architecture/domain constraints
- files likely to change
- checks I should run

Do not modify code yet.
```

After reviewing the plan:

```text
Now implement only the accepted issue scope.
Do not invent unresolved domain or API behavior.
Keep the existing architecture and design system intact.
Run the relevant checks and report exactly what passed or failed.
```

For a PR review, you can also give the LLM the issue, PR diff, and relevant documentation and ask it to check the implementation against the acceptance criteria.

**Never blindly accept AI-generated code.** You are responsible for the branch and the PR you submit.

---

## 17. When You Get Stuck

Use this order:

1. Re-read the issue.
2. Search the repository for an existing pattern.
3. Read the referenced documentation.
4. Check `git status`.
5. Check the exact error message.
6. Ask an LLM to explain the problem using the repository context.
7. If the problem is an unresolved product or architectural decision, stop and raise it instead of guessing.

A technical implementation problem and a missing product decision are different problems. Do not solve the second one by pretending it is the first.

---

## 18. Definition of Done

Before considering your issue complete, verify:

- [ ] The issue acceptance criteria are satisfied.
- [ ] The implementation stays within scope.
- [ ] Existing architecture and domain rules are respected.
- [ ] The code is typed and consistent with project standards.
- [ ] Relevant tests/checks pass.
- [ ] UI changes are responsive and accessible where applicable.
- [ ] Loading/error/empty states are handled where applicable.
- [ ] No accidental debug code or `console.log` statements remain.
- [ ] Documentation was updated if required.
- [ ] The diff has been self-reviewed.
- [ ] The PR explains what changed and how it was tested.

---

## 19. Final Workflow Cheat Sheet

For most contributors, this is enough:

```bash
# Get the latest code
git switch main
git pull origin main

# Create your issue branch
git switch -c feature/my-change

# Work on the issue
# ... edit files ...

# Check your work
git status
git diff
npm run typecheck
npm run lint

# Save the work
git add .
git commit -m "feat(scope): describe the change"

# Send it to GitHub
git push -u origin feature/my-change
```

Then open a Pull Request into `main`, link the GitHub Issue, describe what changed, list the checks you ran, and wait for review.

---

## 20. The Principle Behind All of This

AquaVeda is intentionally being built with multiple contributors in mind.

The goal is not to make every contributor memorize the entire architecture. The goal is to make the repository explain itself well enough that contributors can make correct decisions without repeatedly depending on one person for context.

When in doubt:

> **Follow the issue. Respect the documented decisions. Keep the change focused. Test it. Open the PR.**

That is the workflow.
