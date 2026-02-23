const { createRunState, applyTransition } = require("./pipeline_state_machine");

function sampleRunEnvelope() {
  return {
    runId: "run-2026-02-23-001",
    idempotencyKey: "vidgen-demo-001",
    ownerAgent: "director",
    startedAt: new Date().toISOString()
  };
}

function transitions() {
  return [
    {
      transitionId: "t1",
      stage: "trend_intake",
      decision: "pass",
      artifact: {
        candidates: [{ topic: "ai tools", score: 0.91 }],
        citations: ["https://developers.google.com/youtube/v3/docs/videos/list"]
      }
    },
    {
      transitionId: "t2",
      stage: "topic_ranking",
      decision: "pass",
      artifact: { selectedTopic: "ai tools", rationale: "highest confidence" }
    },
    {
      transitionId: "t3",
      stage: "script_composition",
      decision: "pass",
      artifact: {
        hook: "This trend is moving faster than most creators realize.",
        scenes: [{ id: "scene-1", objective: "setup trend context" }],
        assetPlan: [{ type: "image", prompt: "dashboard trend chart" }]
      }
    },
    {
      transitionId: "t4",
      stage: "continuity_review",
      decision: "pass",
      artifact: {
        decision: "pass",
        findings: []
      }
    },
    {
      transitionId: "t5",
      stage: "render",
      decision: "pass",
      artifact: {
        jobIds: ["seedance-job-1"],
        outputs: [{ path: "/tmp/output.mp4", checksum: "abc123" }]
      }
    },
    {
      transitionId: "t6",
      stage: "qa_gate",
      decision: "pass",
      artifact: {
        jobIds: ["qa-1"],
        outputs: [{ path: "/tmp/output.mp4", checksum: "abc123" }]
      }
    },
    {
      transitionId: "t7",
      stage: "publish",
      decision: "pass",
      artifact: {
        videoId: "yt-demo-id",
        videoUrl: "https://www.youtube.com/watch?v=yt-demo-id",
        visibility: "private"
      }
    },
    {
      transitionId: "t8",
      stage: "feedback",
      decision: "pass",
      artifact: {
        entries: [{ metric: "ctr", value: 0.08 }]
      }
    }
  ];
}

function main() {
  let state = createRunState(sampleRunEnvelope());

  for (const transition of transitions()) {
    state = applyTransition(state, transition);
  }

  console.log(JSON.stringify(state, null, 2));
}

main();

