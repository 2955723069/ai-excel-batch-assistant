import { type ExtractedData, type JevResult } from "@/schemas/analysis";
import { JevApiError, requestJevDecision } from "@/lib/jev/client";

export async function decideLead(input: ExtractedData): Promise<JevResult> {
  try {
    return await requestJevDecision(input);
  } catch (error) {
    if (error instanceof JevApiError) {
      console.error("Jev decision unavailable", { message: error.message });
    } else {
      console.error("Unexpected Jev decision error");
    }
    return fallbackDecision(input);
  }
}

function fallbackDecision(input: ExtractedData): JevResult {
  const hasComplaint = input.objections.some((item) => /投诉|退款|售后|故障/.test(item));
  const signalCount = input.buying_signals.length;
  const hasTimeline = Boolean(input.timeline);
  const hasBudget = Boolean(input.budget);
  const hasDecisionMaker = Boolean(input.decision_maker);

  if (hasComplaint) {
    return {
      lead_level: "C",
      priority: "low",
      human_required: true,
      next_action: "human_review",
      reason_codes: ["customer_complaint", "jev_unavailable"],
    };
  }

  const intentScore = Math.min(100, signalCount * 25 + (hasTimeline ? 25 : 0) + (hasBudget ? 15 : 0));
  const leadLevel = intentScore >= 75 && signalCount >= 2 ? "A" : intentScore >= 45 && signalCount >= 1 ? "B" : "C";
  const nextAction = leadLevel === "A"
    ? (!hasBudget ? "ask_budget" : !hasDecisionMaker ? "ask_decision_maker" : !hasTimeline ? "ask_timeline" : "sales_follow_up")
    : leadLevel === "B" && input.needs.length > 0
      ? "send_product_material"
      : "long_term_nurture";

  return {
    lead_level: leadLevel,
    priority: leadLevel === "A" ? "high" : leadLevel === "B" ? "medium" : "low",
    human_required: false,
    next_action: nextAction,
    reason_codes: ["jev_unavailable", ...(signalCount > 0 ? ["buying_signal_present"] : [])],
  };
}
