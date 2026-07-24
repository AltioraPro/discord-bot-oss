import { describe, expect, test } from "bun:test";
import { classifyVoiceChange } from "./transitions";

const DEEPWORK_A = "111111111111111111";
const DEEPWORK_B = "222222222222222222";
const LOUNGE = "999999999999999999";
const USER = "123456789012345678";

const CHANNELS = [DEEPWORK_A, DEEPWORK_B] as const;

function change(from: string | null, to: string | null, isBot = false) {
  return {
    deepworkChannels: CHANNELS,
    from,
    isBot,
    to,
    userId: USER,
  };
}

describe("classifyVoiceChange", () => {
  test("reports joining a deepwork channel from nowhere", () => {
    expect(classifyVoiceChange(change(null, DEEPWORK_A))).toEqual({
      channelId: DEEPWORK_A,
      type: "joined",
      userId: USER,
    });
  });

  test("reports joining a deepwork channel from another channel", () => {
    expect(classifyVoiceChange(change(LOUNGE, DEEPWORK_A))).toEqual({
      channelId: DEEPWORK_A,
      type: "joined",
      userId: USER,
    });
  });

  test("reports leaving voice entirely", () => {
    expect(classifyVoiceChange(change(DEEPWORK_A, null))).toEqual({
      channelId: DEEPWORK_A,
      type: "left",
      userId: USER,
    });
  });

  test("reports leaving for a channel outside deepwork", () => {
    expect(classifyVoiceChange(change(DEEPWORK_A, LOUNGE))).toEqual({
      channelId: DEEPWORK_A,
      type: "left",
      userId: USER,
    });
  });

  test("reports moving between two deepwork channels", () => {
    expect(classifyVoiceChange(change(DEEPWORK_A, DEEPWORK_B))).toEqual({
      from: DEEPWORK_A,
      to: DEEPWORK_B,
      type: "moved",
      userId: USER,
    });
  });

  test("ignores a change within the same deepwork channel", () => {
    // voiceStateUpdate also fires on mute, deafen and streaming changes, where
    // the channel is unchanged. Treating those as joins would restart the
    // session every time someone touched their microphone.
    expect(classifyVoiceChange(change(DEEPWORK_A, DEEPWORK_A))).toEqual({
      reason: "no-channel-change",
      type: "ignored",
    });
  });

  test("ignores a change within the same non-deepwork channel", () => {
    expect(classifyVoiceChange(change(LOUNGE, LOUNGE))).toEqual({
      reason: "no-channel-change",
      type: "ignored",
    });
  });

  test("ignores movement entirely outside deepwork channels", () => {
    expect(classifyVoiceChange(change(LOUNGE, null))).toEqual({
      reason: "outside-deepwork",
      type: "ignored",
    });
  });

  test("ignores bots joining a deepwork channel", () => {
    expect(classifyVoiceChange(change(null, DEEPWORK_A, true))).toEqual({
      reason: "bot",
      type: "ignored",
    });
  });

  test("ignores bots leaving a deepwork channel", () => {
    expect(classifyVoiceChange(change(DEEPWORK_A, null, true))).toEqual({
      reason: "bot",
      type: "ignored",
    });
  });

  test("ignores everything when no deepwork channels are configured", () => {
    expect(
      classifyVoiceChange({
        deepworkChannels: [],
        from: null,
        isBot: false,
        to: DEEPWORK_A,
        userId: USER,
      })
    ).toEqual({ reason: "outside-deepwork", type: "ignored" });
  });

  test("ignores a null to null change", () => {
    expect(classifyVoiceChange(change(null, null))).toEqual({
      reason: "no-channel-change",
      type: "ignored",
    });
  });
});
