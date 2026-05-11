import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { transitionPlan, transitionMilestone, derivePlanStatus } from "./state.js";

describe("transitionPlan", () => {
  it("allows draft → approved, draft → executed", () => {
    assert.equal(transitionPlan("draft", "approved"), "approved");
    assert.equal(transitionPlan("draft", "executed"), "executed");
  });

  it("allows approved → executed → imported", () => {
    assert.equal(transitionPlan("approved", "executed"), "executed");
    assert.equal(transitionPlan("executed", "imported"), "imported");
  });

  it("allows no-op transitions", () => {
    assert.equal(transitionPlan("draft", "draft"), "draft");
    assert.equal(transitionPlan("imported", "imported"), "imported");
  });

  it("rejects illegal transitions", () => {
    assert.throws(() => transitionPlan("draft", "imported"), /Illegal plan transition/);
    assert.throws(() => transitionPlan("imported", "draft"), /Illegal plan transition/);
    assert.throws(() => transitionPlan("executed", "approved"), /Illegal plan transition/);
  });
});

describe("transitionMilestone", () => {
  it("allows pending → executed | rejected | skipped-mcp", () => {
    assert.equal(transitionMilestone("pending", "executed"), "executed");
    assert.equal(transitionMilestone("pending", "rejected"), "rejected");
    assert.equal(transitionMilestone("pending", "skipped-mcp"), "skipped-mcp");
  });

  it("allows rejected → pending (resume after edit)", () => {
    assert.equal(transitionMilestone("rejected", "pending"), "pending");
  });

  it("allows skipped-mcp → executed", () => {
    assert.equal(transitionMilestone("skipped-mcp", "executed"), "executed");
  });

  it("rejects illegal milestone transitions", () => {
    assert.throws(() => transitionMilestone("executed", "skipped-mcp"), /Illegal/);
    assert.throws(() => transitionMilestone("rejected", "executed"), /Illegal/);
  });
});

describe("derivePlanStatus", () => {
  it("flips draft → executed when all milestones executed", () => {
    const result = derivePlanStatus("draft", [
      { status: "executed" },
      { status: "executed" },
    ]);
    assert.equal(result, "executed");
  });

  it("flips approved → executed when all milestones executed", () => {
    const result = derivePlanStatus("approved", [{ status: "executed" }]);
    assert.equal(result, "executed");
  });

  it("stays in current state when any milestone is non-executed", () => {
    assert.equal(
      derivePlanStatus("draft", [{ status: "executed" }, { status: "pending" }]),
      "draft",
    );
    assert.equal(
      derivePlanStatus("approved", [{ status: "executed" }, { status: "rejected" }]),
      "approved",
    );
  });

  it("never downgrades from imported", () => {
    assert.equal(derivePlanStatus("imported", [{ status: "pending" }]), "imported");
  });

  it("returns current when there are no milestones", () => {
    assert.equal(derivePlanStatus("draft", []), "draft");
  });
});
