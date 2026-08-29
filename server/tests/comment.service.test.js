import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { createIssue } from "../src/services/issue.service.js";
import { createKnowledge } from "../src/services/knowledge.service.js";
import { createComment } from "../src/services/comment.service.js";
import { DomainErrorCode } from "../src/services/errors.js";
import {
  setupTestDb,
  teardownTestDb,
  clearCollections,
  fakeActor,
  fakeObjectId,
  validPoint,
} from "./helpers/testDb.js";

before(setupTestDb);
after(teardownTestDb);
beforeEach(clearCollections);

async function makeIssue() {
  return createIssue(fakeActor("USER"), {
    title: "Leaking pipe",
    description: "d",
    location: validPoint(),
  });
}

async function makeKnowledge() {
  return createKnowledge(fakeActor("USER"), { title: "t", body: "b" });
}

describe("comment.service — createComment", () => {
  it("creates a top-level Comment on an Issue", async () => {
    const issue = await makeIssue();
    const author = fakeActor("USER");
    const comment = await createComment(author, {
      refType: "ISSUE",
      refId: issue._id,
      body: "This is affecting my street too.",
    });
    assert.equal(comment.refType, "ISSUE");
    assert.equal(String(comment.refId), String(issue._id));
    assert.equal(comment.parentComment, null);
  });

  it("creates a top-level Comment on a Knowledge article (refType WIKI)", async () => {
    const knowledge = await makeKnowledge();
    const comment = await createComment(fakeActor("USER"), {
      refType: "WIKI",
      refId: knowledge._id,
      body: "Great explanation!",
    });
    assert.equal(comment.refType, "WIKI");
    assert.equal(String(comment.refId), String(knowledge._id));
  });

  it("fails with TARGET_NOT_FOUND when refId does not resolve", async () => {
    await assert.rejects(
      () =>
        createComment(fakeActor("USER"), {
          refType: "ISSUE",
          refId: fakeObjectId(),
          body: "orphan comment",
        }),
      (err) => {
        assert.equal(err.code, DomainErrorCode.TARGET_NOT_FOUND);
        return true;
      },
    );
  });

  it("a valid top-level reply to an existing top-level comment succeeds", async () => {
    const issue = await makeIssue();
    const parent = await createComment(fakeActor("USER"), {
      refType: "ISSUE",
      refId: issue._id,
      body: "parent comment",
    });
    const reply = await createComment(fakeActor("USER"), {
      refType: "ISSUE",
      refId: issue._id,
      body: "a reply",
      parentComment: parent._id,
    });
    assert.equal(String(reply.parentComment), String(parent._id));
  });

  it("replying to a reply is rejected (one level of nesting only)", async () => {
    const issue = await makeIssue();
    const parent = await createComment(fakeActor("USER"), {
      refType: "ISSUE",
      refId: issue._id,
      body: "parent",
    });
    const reply = await createComment(fakeActor("USER"), {
      refType: "ISSUE",
      refId: issue._id,
      body: "reply",
      parentComment: parent._id,
    });

    await assert.rejects(
      () =>
        createComment(fakeActor("USER"), {
          refType: "ISSUE",
          refId: issue._id,
          body: "reply to a reply",
          parentComment: reply._id,
        }),
      (err) => {
        assert.equal(err.code, DomainErrorCode.INVALID_PARENT);
        return true;
      },
    );
  });

  it("D-COMMENT-1: a reply targeting a DIFFERENT refId than its parent is rejected", async () => {
    const issueA = await makeIssue();
    const issueB = await makeIssue();
    const parent = await createComment(fakeActor("USER"), {
      refType: "ISSUE",
      refId: issueA._id,
      body: "parent on issue A",
    });

    await assert.rejects(
      () =>
        createComment(fakeActor("USER"), {
          refType: "ISSUE",
          refId: issueB._id, // different target than the parent
          body: "cross-target reply",
          parentComment: parent._id,
        }),
      (err) => {
        assert.equal(err.code, DomainErrorCode.INVALID_PARENT);
        return true;
      },
    );
  });

  it("D-COMMENT-1: a reply targeting a DIFFERENT refType than its parent is rejected", async () => {
    const issue = await makeIssue();
    const knowledge = await makeKnowledge();
    const parent = await createComment(fakeActor("USER"), {
      refType: "ISSUE",
      refId: issue._id,
      body: "parent on an issue",
    });

    await assert.rejects(
      () =>
        createComment(fakeActor("USER"), {
          refType: "WIKI",
          refId: knowledge._id,
          body: "reply pretending to belong to a different refType",
          parentComment: parent._id,
        }),
      (err) => {
        assert.equal(err.code, DomainErrorCode.INVALID_PARENT);
        return true;
      },
    );
  });

  it("D-COMMENT-1: a reply targeting the SAME (refType, refId) as its parent is accepted", async () => {
    const issue = await makeIssue();
    const parent = await createComment(fakeActor("USER"), {
      refType: "ISSUE",
      refId: issue._id,
      body: "parent",
    });
    const reply = await createComment(fakeActor("USER"), {
      refType: "ISSUE",
      refId: issue._id, // same target
      body: "valid same-target reply",
      parentComment: parent._id,
    });
    assert.equal(String(reply.parentComment), String(parent._id));
  });

  it("an unrecognized refType is rejected", async () => {
    const issue = await makeIssue();
    await assert.rejects(
      () =>
        createComment(fakeActor("USER"), {
          refType: "KNOWLEDGE", // not a valid refType — must stay "WIKI"
          refId: issue._id,
          body: "test",
        }),
      (err) => {
        assert.equal(err.code, DomainErrorCode.INVALID_STATE);
        return true;
      },
    );
  });
});
