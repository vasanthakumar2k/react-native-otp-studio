import * as React from "react";
import { StyleSheet, Vibration } from "react-native";
import { render, fireEvent, act, screen } from "@testing-library/react-native";
import { OtpInput, OtpResendTimer, useOtpTimer, formatOtpTime } from "../src";

const hidden = () => screen.getByTestId("otp-input-hidden");
const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);
const cellText = (i: number) => {
  const cell = screen.getByTestId(`otp-input-cell-${i}`);
  const texts = cell.findAll((n: any) => typeof n.props.children === "string" && n.props.allowFontScaling === false);
  return texts.length ? texts[0].props.children : "";
};
const flush = () => act(async () => {});

describe("RTL", () => {
  it("cell row is always left to right", () => {
    render(<OtpInput length={2} />);
    const row = screen.UNSAFE_root.findAll((n: any) => StyleSheet.flatten(n.props.style)?.flexDirection === "row")[0];
    expect(StyleSheet.flatten(row.props.style).direction).toBe("ltr");
  });
});

describe("success", () => {
  it("uses successColor, and error wins over success", () => {
    const { rerender } = render(<OtpInput length={1} success successColor="#0f0" />);
    expect(flat("otp-input-cell-0").borderColor).toBe("#0f0");
    rerender(<OtpInput length={1} success error />);
    expect(flat("otp-input-cell-0").borderColor).toBe("#EF4444");
  });

  it("renderCell receives isSuccess", () => {
    const seen: boolean[] = [];
    render(<OtpInput length={1} success renderCell={(s) => (seen.push(s.isSuccess), null)} />);
    expect(seen[0]).toBe(true);
  });
});

describe("maskDelay", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows the last digit, then masks it", () => {
    render(<OtpInput length={3} mask maskDelay={500} />);
    fireEvent.changeText(hidden(), "1");
    expect(cellText(0)).toBe("1");
    fireEvent.changeText(hidden(), "12");
    expect(cellText(0)).toBe("•");
    expect(cellText(1)).toBe("2");
    act(() => jest.advanceTimersByTime(500));
    expect(cellText(1)).toBe("•");
  });

  it("without maskDelay masks at once (old behaviour)", () => {
    render(<OtpInput length={2} mask />);
    fireEvent.changeText(hidden(), "1");
    expect(cellText(0)).toBe("•");
  });
});

describe("vibrateOnError", () => {
  it("vibrates only when asked", () => {
    const spy = jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
    const { rerender } = render(<OtpInput length={1} />);
    rerender(<OtpInput length={1} error />);
    expect(spy).not.toHaveBeenCalled();
    rerender(<OtpInput length={1} vibrateOnError={120} />);
    rerender(<OtpInput length={1} vibrateOnError={120} error />);
    expect(spy).toHaveBeenCalledWith(120);
    spy.mockRestore();
  });
});

describe("entryAnimation", () => {
  it("still shows the typed digit", () => {
    render(<OtpInput length={2} entryAnimation="pop" />);
    fireEvent.changeText(hidden(), "7");
    expect(cellText(0)).toBe("7");
  });
});

describe("preset", () => {
  it("fills in colors, your props win", () => {
    const { rerender } = render(<OtpInput length={1} preset="dark" />);
    expect(flat("otp-input-cell-0")).toMatchObject({ backgroundColor: "#1F2937", borderColor: "#374151" });
    rerender(<OtpInput length={1} preset="dark" backgroundColor="#123456" />);
    expect(flat("otp-input-cell-0").backgroundColor).toBe("#123456");
  });

  it("minimal preset uses underline unless a shape is given", () => {
    const { rerender } = render(<OtpInput length={1} preset="minimal" />);
    expect(flat("otp-input-cell-0").borderBottomWidth).toBe(2);
    rerender(<OtpInput length={1} preset="minimal" shape="circle" />);
    expect(flat("otp-input-cell-0").borderWidth).toBe(1.5);
  });
});

describe("completeDelay", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("waits before onComplete and cancels if the code changes", () => {
    const onComplete = jest.fn();
    render(<OtpInput length={2} completeDelay={150} onComplete={onComplete} />);
    fireEvent.changeText(hidden(), "12");
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.changeText(hidden(), "1");
    act(() => jest.advanceTimersByTime(200));
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.changeText(hidden(), "13");
    act(() => jest.advanceTimersByTime(150));
    expect(onComplete).toHaveBeenCalledWith("13");
  });
});

describe("onVerify", () => {
  it("onComplete still fires every time (old behaviour)", () => {
    const onComplete = jest.fn();
    render(<OtpInput length={2} onComplete={onComplete} />);
    fireEvent.changeText(hidden(), "12");
    fireEvent.changeText(hidden(), "1");
    fireEvent.changeText(hidden(), "12");
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it("does not verify the same code twice and shows success", async () => {
    const onVerify = jest.fn().mockResolvedValue(true);
    render(<OtpInput length={2} onVerify={onVerify} successColor="#0f0" />);
    fireEvent.changeText(hidden(), "12");
    await flush();
    expect(flat("otp-input-cell-0").borderColor).toBe("#0f0");
    fireEvent.changeText(hidden(), "1");
    fireEvent.changeText(hidden(), "12");
    await flush();
    expect(onVerify).toHaveBeenCalledTimes(1);
  });

  it("false shows the error state, typing clears it", async () => {
    render(<OtpInput length={2} onVerify={async () => false} />);
    fireEvent.changeText(hidden(), "12");
    await flush();
    expect(flat("otp-input-cell-0").borderColor).toBe("#EF4444");
    fireEvent.changeText(hidden(), "1");
    expect(flat("otp-input-cell-0").borderColor).not.toBe("#EF4444");
  });

  it("ignores typing while verifying", async () => {
    let done: (v: boolean) => void = () => {};
    const onChange = jest.fn();
    render(<OtpInput length={2} onChange={onChange} onVerify={() => new Promise<boolean>((r) => (done = r))} />);
    fireEvent.changeText(hidden(), "12");
    await flush();
    fireEvent.changeText(hidden(), "1");
    expect(onChange).toHaveBeenCalledTimes(1);
    await act(async () => done(true));
    fireEvent.changeText(hidden(), "1");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("a thrown error allows retrying the same code", async () => {
    const onVerify = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(true);
    render(<OtpInput length={2} onVerify={onVerify} />);
    fireEvent.changeText(hidden(), "12");
    await flush();
    fireEvent.changeText(hidden(), "1");
    fireEvent.changeText(hidden(), "12");
    await flush();
    expect(onVerify).toHaveBeenCalledTimes(2);
  });
});

describe("timer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("formatOtpTime", () => {
    expect(formatOtpTime(75)).toBe("1:15");
    expect(formatOtpTime(5)).toBe("0:05");
  });

  it("useOtpTimer counts down and restarts", () => {
    const onFinish = jest.fn();
    let t: ReturnType<typeof useOtpTimer> | undefined;
    const Probe = () => ((t = useOtpTimer(3, { onFinish })), null);
    render(<Probe />);
    expect(t!.seconds).toBe(3);
    act(() => jest.advanceTimersByTime(3100));
    expect(t!.canResend).toBe(true);
    expect(onFinish).toHaveBeenCalledTimes(1);
    act(() => t!.restart());
    expect(t!.seconds).toBe(3);
  });

  it("OtpResendTimer only allows resend after the countdown", () => {
    const onResend = jest.fn();
    render(<OtpResendTimer seconds={2} onResend={onResend} />);
    expect(screen.getByText("Resend code in 0:02")).toBeTruthy();
    fireEvent.press(screen.getByTestId("otp-resend"));
    expect(onResend).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(2100));
    fireEvent.press(screen.getByText("Resend code"));
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Resend code in 0:02")).toBeTruthy();
  });
});
