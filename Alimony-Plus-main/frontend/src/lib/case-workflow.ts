import type { Hearing, LedgerRow, Order, Payment, Proceeding } from "./types";

export type MilestoneStatus = "Completed" | "Upcoming" | "Not recorded";
export type CaseMilestone = {
  name: string;
  date?: string;
  status: MilestoneStatus;
  detail: string;
};
export type CaseAlert = {
  id: string;
  category: "Court order" | "Maintenance";
  date?: string;
  title: string;
  description: string;
  status: string;
};

function milestoneStatus(date?: string, asOf?: string): MilestoneStatus {
  if (!date) return "Not recorded";
  return asOf && date > asOf ? "Upcoming" : "Completed";
}

export function buildCaseMilestones(
  caseId: number,
  proceedings: Proceeding[],
  hearings: Hearing[],
  orders: Order[],
  asOf: string,
): CaseMilestone[] {
  const caseProceedings = proceedings.filter((item) => item.caseId === caseId);
  const proceedingIds = new Set(caseProceedings.map((item) => item.id));
  const caseHearings = hearings.filter((item) => item.caseId === caseId);
  const caseOrders = orders.filter((item) => proceedingIds.has(item.proceedingId));
  const namedDate = (name: Hearing["milestone"]) =>
    caseHearings
      .filter((item) => item.eventType === "milestone" && item.milestone === name)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  const summons = caseHearings
    .filter((item) => item.eventType === "summons")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const filing = caseProceedings
    .filter((item) => item.filedAt)
    .sort((a, b) => (a.filedAt || "").localeCompare(b.filedAt || ""))[0];
  const interimOrder = caseOrders
    .filter((item) => item.orderType?.toLowerCase().includes("interim"))
    .sort((a, b) => (a.orderDate || "").localeCompare(b.orderDate || ""))[0];
  const entries: Array<[string, string | undefined, string]> = [
    ["Filing", filing?.filedAt, filing?.caseNumber || "Court filing"],
    ["Summons", summons?.date, summons?.location || "Summons return date"],
    ["Written Statement", namedDate("Written Statement")?.date, "Milestone date"],
    ["Interim Relief", interimOrder?.orderDate, interimOrder?.orderType || "Order date"],
    ["Evidence", namedDate("Evidence")?.date, "Milestone date"],
    ["Final Arguments", namedDate("Final Arguments")?.date, "Milestone date"],
  ];
  return entries.map(([name, date, detail]) => ({
    name,
    date,
    status: milestoneStatus(date, asOf),
    detail: date ? detail : "No date recorded",
  }));
}

export function buildCaseAlerts(
  orders: Order[],
  payments: Payment[],
  ledger: LedgerRow[],
): CaseAlert[] {
  const orderAlerts: CaseAlert[] = orders.map((order) => ({
    id: `order-${order.id}`,
    category: "Court order",
    date: order.orderDate,
    title: order.orderType || "Court order recorded",
    description: order.description || `Order #${order.id} · ₹${order.amount.toLocaleString("en-IN")}`,
    status: "Recorded",
  }));
  const paymentAlerts: CaseAlert[] = payments.map((payment) => ({
    id: `payment-${payment.id}`,
    category: "Maintenance",
    date: payment.paymentDate,
    title: `${payment.status === "RECEIVED" ? "Payment received" : `Payment ${payment.status.toLowerCase()}`} · ₹${payment.amount.toLocaleString("en-IN")}`,
    description: [payment.period, payment.reference && `Ref ${payment.reference}`]
      .filter(Boolean)
      .join(" · ") || `Order #${payment.orderId}`,
    status: payment.status === "RECEIVED" ? "Received" : payment.status[0] + payment.status.slice(1).toLowerCase(),
  }));
  const ledgerAlerts: CaseAlert[] = ledger
    .filter((row) => row.status === "Overdue" || row.status === "Partially paid" || row.status === "Upcoming")
    .map((row) => ({
      id: `period-${row.orderId}-${row.period}`,
      category: "Maintenance",
      date: row.dueDate,
      title: `${row.status} maintenance · ₹${row.outstanding.toLocaleString("en-IN")}`,
      description: `${row.period} · Order #${row.orderId}`,
      status: row.status,
    }));
  return [...orderAlerts, ...paymentAlerts, ...ledgerAlerts].sort((a, b) =>
    (b.date || "").localeCompare(a.date || ""),
  );
}