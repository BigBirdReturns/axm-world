import { describe, expect, it } from "vitest";
import {
  validateApertureDaemonProjection,
} from "../../../src/world/aperture/ApertureHost.js";
import {
  daemonProjectionFixture,
  storyFixture,
  timedMediaFixture,
} from "./fixtures.js";

describe("ApertureHost daemon projection admission", () => {
  it("accepts one closed ready projection without upgrading authority", () => {
    const story = storyFixture();
    const projection = daemonProjectionFixture(story);
    const result = validateApertureDaemonProjection(projection, story, timedMediaFixture(story));
    expect(result).toMatchObject({ ok: true, warnings: [] });
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.projection).not.toBe(projection);
    expect(result.projection.authority).toBe("external_daemon_projection_only");
    expect(result.projection.anchor?.source_authority).toBe("resolved_playback_state_only");
    expect(result.projection.selection?.source_authority).toBe("selection_receipt_only");
  });

  it("refuses unknown fields, story substitution, answer drift, and cross-work selection", () => {
    const story = storyFixture();
    const timedMedia = timedMediaFixture(story);

    const unknown = { ...daemonProjectionFixture(story), invented: true };
    expect(validateApertureDaemonProjection(unknown, story, timedMedia))
      .toMatchObject({ ok: false, errors: expect.arrayContaining([expect.stringMatching(/unknown field invented/)]) });

    const substituted = daemonProjectionFixture(story);
    substituted.canonical_story_digest = "0".repeat(64);
    expect(validateApertureDaemonProjection(substituted, story, timedMedia))
      .toMatchObject({ ok: false, errors: expect.arrayContaining([expect.stringMatching(/does not match the verified canonical story/)]) });

    const answerDrift = daemonProjectionFixture(story);
    answerDrift.answer!.story_package_id = "story.other";
    expect(validateApertureDaemonProjection(answerDrift, story, timedMedia))
      .toMatchObject({ ok: false, errors: expect.arrayContaining([expect.stringMatching(/answer story package conflicts/)]) });

    const crossWork = daemonProjectionFixture(story);
    crossWork.selection!.work_id = "work.other";
    expect(validateApertureDaemonProjection(crossWork, story, timedMedia))
      .toMatchObject({ ok: false, errors: expect.arrayContaining([expect.stringMatching(/selection work conflicts/)]) });
  });

  it("requires ready state to carry complete scope and a resolved canonical anchor", () => {
    const story = storyFixture();
    const timedMedia = timedMediaFixture(story);
    const projection = daemonProjectionFixture(story);
    projection.story_package_digest = null;
    projection.anchor!.state = "ambiguous";
    projection.anchor!.clock.canonical_position_us = null;
    const result = validateApertureDaemonProjection(projection, story, timedMedia);
    expect(result).toMatchObject({ ok: false });
    if (result.ok) throw new Error("Expected refusal");
    expect(result.errors.join("\n")).toMatch(/complete story, package, viewer, and work identity/);
    expect(result.errors.join("\n")).toMatch(/requires a resolved anchor/);
  });

  it("accepts explicitly empty unavailable and unsupported states only", () => {
    const story = storyFixture();
    const timedMedia = timedMediaFixture(story);
    for (const state of ["unavailable", "unsupported"] as const) {
      expect(validateApertureDaemonProjection(
        daemonProjectionFixture(story, state),
        story,
        timedMedia,
      )).toMatchObject({ ok: true });
    }

    const leaked = daemonProjectionFixture(story, "unavailable");
    leaked.work_id = "work.leaked";
    expect(validateApertureDaemonProjection(leaked, story, timedMedia))
      .toMatchObject({ ok: false, errors: expect.arrayContaining([expect.stringMatching(/must not retain partial authority identity/)]) });
  });

  it("preserves manual, acoustic, predicted, and stale evidence as warnings", () => {
    const story = storyFixture();
    const timedMedia = timedMediaFixture(story);
    for (const mode of ["manual", "acoustic", "predicted"] as const) {
      const projection = daemonProjectionFixture(story, "partial");
      projection.anchor!.clock.mode = mode;
      const result = validateApertureDaemonProjection(projection, story, timedMedia);
      expect(result).toMatchObject({ ok: true });
      if (!result.ok) throw new Error(result.errors.join("\n"));
      expect(result.warnings.join("\n")).toMatch(new RegExp(mode));
    }

    const stale = daemonProjectionFixture(story, "stale");
    stale.answer!.anchor_id = `anchor1_${"f".repeat(64)}`;
    const result = validateApertureDaemonProjection(stale, story, timedMedia);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.warnings).toContain("answer coordinate is bound to an older anchor");
  });

  it("refuses a negative rational playback-rate numerator", () => {
    const story = storyFixture();
    const projection = daemonProjectionFixture(story);
    projection.anchor!.clock.rate_numerator = -1;
    const result = validateApertureDaemonProjection(
      projection,
      story,
      timedMediaFixture(story),
    );
    expect(result).toMatchObject({ ok: false });
    if (result.ok) throw new Error("Expected refusal");
    expect(result.errors.join("\n")).toMatch(/rate_numerator.*>= 0/);
  });

  it("refuses controlling source authority and non-same-work selection", () => {
    const story = storyFixture();
    const projection = daemonProjectionFixture(story) as unknown as {
      anchor: { source_authority: string };
      selection: { same_work_only: boolean };
    };
    projection.anchor.source_authority = "world_controls_player";
    projection.selection.same_work_only = false;
    const result = validateApertureDaemonProjection(projection, story, timedMediaFixture(story));
    expect(result).toMatchObject({ ok: false });
    if (result.ok) throw new Error("Expected refusal");
    expect(result.errors.join("\n")).toMatch(/authority upgrade refused/);
    expect(result.errors.join("\n")).toMatch(/cross-work selection refused/);
  });
});
