# Product Invariants

Framework-independent truths about how AquaVeda works. They survive
rewrites, redesigns, and platform changes because they describe the
*product*, not any implementation of it.

Changing one is a product decision that requires a new ADR — it does not
happen as a side effect of a feature ticket or an architectural refactor.

---

1. **Every Issue has exactly one location.**
   Geo-tagging is not an optional field. It's what makes the map the
   primary navigation surface possible at all.

2. **Knowledge articles require moderation before they are public.**
   Nothing reaches the Learn surface without expert or admin approval.
   There are no exceptions for trusted users or auto-approved categories.

3. **Projects originate from Issues, never the reverse.**
   A project without a real, reported problem behind it cannot exist.

4. **Issues exist independently of Projects.**
   A reported problem is real and visible whether or not anyone has
   organized a project around it.

5. **Anonymous users may explore.**
   Browsing the map, reading approved knowledge, and viewing issues
   never requires an account.

6. **Contributing requires an account.**
   Reporting, commenting, writing articles, and organizing projects are
   gated on identity. There are no anonymous writes, anywhere.

7. **AI guidance never overrides verified knowledge.**
   When the recommendation engine and an expert-approved article
   disagree, the article wins.

8. **The map is first-class navigation.**
   The map is not a secondary visualization of data that lives somewhere
   else first. It is the primary way to encounter what is happening.

9. **Experts verify. Admins govern. Neither substitutes for the other.**
   Expert approval is domain authority over knowledge quality.
   Admin authority is platform governance. They are different powers
   with different scopes.

10. **Every contribution has an owner.**
    Every issue, comment, article, and project traces to the account
    that created it.
