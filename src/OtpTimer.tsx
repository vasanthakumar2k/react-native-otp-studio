import * as React from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

/** 75 -> "1:15" */
export function formatOtpTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface UseOtpTimerOptions {
  /** Start counting on mount. Default true. */
  autoStart?: boolean;
  /** Called once when the countdown reaches 0. */
  onFinish?: () => void;
}

export interface UseOtpTimerResult {
  /** Seconds left. */
  seconds: number;
  /** "0:30" style text. */
  formatted: string;
  /** True once the countdown is over (or was never started). */
  canResend: boolean;
  isRunning: boolean;
  /** Start again from `seconds` (or the given value). */
  restart: (seconds?: number) => void;
  stop: () => void;
}

/**
 * Countdown for "Resend code in 0:30". Based on the clock, so it stays correct
 * when the app was in the background.
 */
export function useOtpTimer(seconds = 30, options: UseOtpTimerOptions = {}): UseOtpTimerResult {
  const { autoStart = true, onFinish } = options;
  const [remaining, setRemaining] = React.useState(autoStart ? seconds : 0);
  const endAt = React.useRef<number | null>(null);
  const [run, setRun] = React.useState(0);
  const finish = React.useRef(onFinish);
  finish.current = onFinish;

  if (autoStart && run === 0 && endAt.current === null) endAt.current = Date.now() + seconds * 1000;

  React.useEffect(() => {
    const end = endAt.current;
    if (end === null) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        if (id !== undefined) clearInterval(id);
        if (endAt.current === end) {
          endAt.current = null;
          finish.current?.();
        }
      }
    };
    id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [run]);

  const restart = React.useCallback(
    (s: number = seconds) => {
      endAt.current = Date.now() + s * 1000;
      setRemaining(s);
      setRun((r) => r + 1);
    },
    [seconds],
  );

  const stop = React.useCallback(() => {
    endAt.current = null;
    setRemaining(0);
    setRun((r) => r + 1);
  }, []);

  return {
    seconds: remaining,
    formatted: formatOtpTime(remaining),
    canResend: remaining === 0,
    isRunning: remaining > 0,
    restart,
    stop,
  };
}

export interface OtpResendTimerProps {
  /** Countdown length in seconds. Default 30. */
  seconds?: number;
  /** Called when the user taps "Resend code". The countdown restarts. */
  onResend: () => void;
  /** Start counting on mount. Default true. */
  autoStart?: boolean;
  /** Text once resend is allowed. Default "Resend code". */
  resendText?: string;
  /** Text while waiting. Default `Resend code in ${time}`. */
  waitingText?: (time: string, seconds: number) => string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Text style while waiting. */
  textStyle?: StyleProp<TextStyle>;
  /** Text style when resend is allowed. */
  activeTextStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function OtpResendTimer({
  seconds = 30,
  onResend,
  autoStart = true,
  resendText = "Resend code",
  waitingText = (time) => `Resend code in ${time}`,
  disabled = false,
  style,
  textStyle,
  activeTextStyle,
  testID = "otp-resend",
}: OtpResendTimerProps) {
  const timer = useOtpTimer(seconds, { autoStart });
  const ready = timer.canResend && !disabled;
  return (
    <Pressable
      testID={testID}
      disabled={!ready}
      accessibilityRole="button"
      accessibilityState={{ disabled: !ready }}
      hitSlop={8}
      style={style}
      onPress={() => {
        timer.restart();
        onResend();
      }}
    >
      <Text style={ready ? [styles.active, activeTextStyle] : [styles.waiting, textStyle]}>
        {timer.canResend ? resendText : waitingText(timer.formatted, timer.seconds)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  waiting: { color: "#6B7280", fontSize: 14 },
  active: { color: "#6366F1", fontSize: 14, fontWeight: "600" },
});
