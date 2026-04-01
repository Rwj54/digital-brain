import {
  formatConfidence,
  formatDifficulty,
  formatWho,
} from "@/lib/owner/formatters";
import {
  type OwnerPageDashboard,
  type OwnerTasksResponse,
  type RenderStep,
} from "@/lib/owner/types";

export function buildOwnerSteps(
  dashboard: OwnerPageDashboard,
  tasksData: OwnerTasksResponse,
): RenderStep[] {
  if (tasksData.tasks.length > 0) {
    return [...tasksData.tasks]
      .sort((a, b) => {
        const aStatus = a.status === "open" ? 0 : 1;
        const bStatus = b.status === "open" ? 0 : 1;

        if (aStatus !== bStatus) {
          return aStatus - bStatus;
        }

        return a.sort_order - b.sort_order;
      })
      .slice(0, 3)
      .map((task, index) => ({
        key: task.id,
        kind: "task" as const,
        index: index + 1,
        title: task.title,
        reason: task.plain_language_reason ?? "No explanation available.",
        who: task.who_should_do_it ? formatWho(task.who_should_do_it) : "Not set",
        time: task.time_to_complete_estimate ?? "Not set",
        difficulty: task.difficulty
          ? formatDifficulty(task.difficulty)
          : "Not set",
        expectedBenefit: task.expected_benefit ?? "Expected benefit not set.",
        proofOfCompletion:
          task.proof_of_completion ?? "Proof of completion not set.",
        confidenceLabel: formatConfidence(task.confidence_level),
        status: task.status,
        task,
      }));
  }

  return dashboard.dashboard.topPriorities.slice(0, 3).map((priority, index) => ({
    key: `${priority.sort_order}-${priority.title}`,
    kind: "priority" as const,
    index: index + 1,
    title: priority.title,
    reason: priority.plain_language_reason,
    who: formatWho(priority.who_should_do_it),
    time: priority.time_to_complete_estimate,
    difficulty: formatDifficulty(priority.difficulty),
    expectedBenefit: priority.expected_benefit,
    proofOfCompletion: priority.proof_of_completion,
    confidenceLabel: formatConfidence(priority.confidence_level),
    status: "recommended",
  }));
}