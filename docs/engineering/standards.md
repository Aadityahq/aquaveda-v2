# Engineering Standards

## Coding standards

- TypeScript, strictly.
- Server Components by default.
- Small, focused files.
- No prop drilling past two levels.
- Comments explain why, not what.
- No console.log in committed code.

## Dependency policy

A dependency is added in the same commit as the first file that imports it. `package.json` reflects what is actually built, not what is planned.

## Definition of Done

- Functional
- Responsive
- Accessible
- Typed
- Tested
- Self-reviewed
- Documented
- No TODOs for core functionality