import { describe, expect, it } from "vitest";
import { buildCaseAlerts, buildCaseMilestones } from "../src/lib/case-workflow";
import { demoWorkspace } from "../src/lib/demo";
import { buildLedger } from "../src/lib/ledger";

describe("case diary data", () => {
  it("derives recorded milestones and leaves unsupported stages unrecorded", () => {
    const data = demoWorkspace();
    const milestones = buildCaseMilestones(1, data.proceedings, data.hearings, data.orders, "2026-10-09");
    expect(milestones[0]).toMatchObject({ name: "Filing", date: "2026-04-12", status: "Completed" });
    expect(milestones[1]).toMatchObject({ name: "Summons", status: "Not recorded" });
    expect(milestones[2]).toMatchObject({ name: "Written Statement", status: "Not recorded" });
    expect(milestones[3]).toMatchObject({ name: "Interim Relief", date: "2026-05-22", status: "Completed" });
  });

  it("marks explicit future milestones upcoming", () => {
    const data = demoWorkspace();
    const milestones = buildCaseMilestones(
      1,
      data.proceedings,
      [...data.hearings, { id: 3, caseId: 1, date: "2026-11-02", title: "Evidence", location: "Courtroom 3", eventType: "milestone", milestone: "Evidence" }],
      data.orders,
      "2026-10-09",
    );
    expect(milestones.find((item) => item.name === "Evidence")).toMatchObject({ status: "Upcoming", date: "2026-11-02" });
  });

  it("creates alert rows from orders, payments, and explicit schedule statuses", () => {
    const data = demoWorkspace();
    const alerts = buildCaseAlerts(data.orders, data.payments, buildLedger(data.orders, data.payments, "2026-10-09"));
    expect(alerts.some((item) => item.category === "Court order" && item.status === "Recorded")).toBe(true);
    expect(alerts.some((item) => item.category === "Maintenance" && item.status === "Received")).toBe(true);
    expect(alerts.some((item) => item.status === "Overdue")).toBe(true);
  });
});