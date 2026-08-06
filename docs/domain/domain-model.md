# Domain Model

Everything in the product is a UI over a small set of primitives.

## User

Identity and role. Roles: `USER`, `EXPERT`, `ADMIN`.

## Issue

A geo-tagged, reported problem. Always has a location.

## Knowledge

A moderated article. Draft until approved, then public.

## Comment

Attached to either an Issue or a Knowledge article via a refType discriminator.

## Project

Created from an Issue, never standalone.

## Recommendation

Output of the rule engine attached to an Issue. Must carry reasoning.

## Product Invariants

1. Issues exist independently of Projects.
2. Projects are created from Issues, never the reverse.
3. Knowledge articles require moderation before going public.
4. AI guidance never overrides verified knowledge.
5. The map is the primary way to encounter what is happening.
6. Anonymous users can explore; contributing requires an account.
7. Experts verify. Admins govern. Neither substitutes for the other.