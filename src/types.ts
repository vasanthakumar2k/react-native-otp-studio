import type * as React from "react";
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from "react-native";
import type { OtpTransform, OtpType } from "./utils";

export type OtpShape = "square" | "rounded" | "circle" | "pill" | "underline";

export type OtpPosition =
  | "center"
  | "left"
  | "right"
  | "space-between"
  | "space-around"
  | "space-evenly";

/** Ready-made looks. Any prop you pass still wins over the preset. */
export type OtpPreset = "dark" | "minimal" | "neon";

/** How a typed character comes into its box. */
export type OtpEntryAnimation = "none" | "pop" | "fade";

export interface OtpShadow {
  color?: string;
  opacity?: number;
  radius?: number;
  offset?: { width: number; height: number };
  /** Android elevation. */
  elevation?: number;
}

export interface OtpCellState {
  index: number;
  char: string;
  /** What is shown (mask character when masked). */
  displayChar: string;
  isActive: boolean;
  isFilled: boolean;
  hasError: boolean;
  /** True when `success` is set or `onVerify` resolved `true`. */
  isSuccess: boolean;
}

export interface OtpInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  setValue: (value: string) => void;
  getValue: () => string;
}

export interface OtpInputProps {
  /** Number of boxes / digits. Default 6. */
  length?: number;
  /** Controlled value. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fired once every box is filled. */
  onComplete?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /**
   * Optional verify step, called after `onComplete`. Resolve `true` for success,
   * `false` for a wrong code. Typing is paused while it runs, and the same code
   * is not sent twice in a row (a thrown error allows a retry).
   */
  onVerify?: (value: string) => Promise<boolean | void> | boolean | void;
  /** Wait this many ms after the last character before `onComplete` / `onVerify`. Default 0. */
  completeDelay?: number;

  /** Allowed characters. Default "numeric". */
  type?: OtpType;
  /** Applied before validation, e.g. "uppercase". */
  transform?: OtpTransform;
  /** Hide entered characters: `true` shows "•", or pass your own character. */
  mask?: boolean | string;
  /** With `mask`, show the last typed character for this many ms before hiding it. Default 0. */
  maskDelay?: number;

  /** Ready-made look: "dark", "minimal" or "neon". Your own props override it. */
  preset?: OtpPreset;

  /** Box shape. Default "rounded". */
  shape?: OtpShape;
  /** Box size in dp (height; width for square/rounded/circle). Default 52. */
  size?: number;
  /** Override box width. */
  cellWidth?: number;
  /** Override box height. */
  cellHeight?: number;
  /** Space between boxes. Default 10. */
  gap?: number;
  /** Override the shape's corner radius. */
  borderRadius?: number;
  /** Border thickness. Default 1.5 (2 for underline). */
  borderWidth?: number;
  /** Horizontal alignment of the boxes. Default "center". */
  position?: OtpPosition;

  /* Colors */
  textColor?: string;
  backgroundColor?: string;
  activeBackgroundColor?: string;
  filledBackgroundColor?: string;
  borderColor?: string;
  activeBorderColor?: string;
  filledBorderColor?: string;
  errorColor?: string;
  /** Border colour in the success state. Default "#16A34A". */
  successColor?: string;
  cursorColor?: string;
  placeholderTextColor?: string;

  /** `true` for a soft default shadow, or customise it. */
  shadow?: boolean | OtpShadow;
  /** Glow in the active border colour around the focused box. Default false. */
  activeGlow?: boolean;

  /** Frosted glass boxes. */
  glassEffect?: boolean;
  /** Glass tint. Default "light". */
  glassTint?: "light" | "dark";
  /** Glass fill opacity 0–1. Default 0.18. */
  glassOpacity?: number;
  /**
   * Optional real blur, e.g. `BlurView` from `expo-blur` or `@react-native-community/blur`.
   * Without it the glass look is drawn with translucent layers (no extra dependency).
   */
  BlurComponent?: React.ComponentType<any>;
  /** Passed to BlurComponent as `intensity` and `blurAmount`. Default 30. */
  blurIntensity?: number;

  /* Text */
  fontSize?: number;
  fontWeight?: TextStyle["fontWeight"];
  fontFamily?: string;
  /** One character for every box, or one per box ("------"). */
  placeholder?: string;

  /** Blinking cursor in the active box. Default true. */
  showCursor?: boolean;
  /** Pop animation on the active box. Default true. */
  animated?: boolean;
  /** Shake when `error` turns true. Default true. */
  shakeOnError?: boolean;
  /**
   * Vibrate when `error` turns true: `true` for 60 ms, or a duration in ms. Default false.
   * Android needs the VIBRATE permission (Expo includes it).
   */
  vibrateOnError?: boolean | number;
  /** Animation for a newly typed character. Default "none". */
  entryAnimation?: OtpEntryAnimation;

  /** Shown between boxes, or between groups when `groups` is set. */
  separator?: React.ReactNode;
  /** Group sizes, e.g. [3, 3] → "123 - 456". Must add up to `length`. */
  groups?: number[];

  error?: boolean;
  /** Green "code accepted" state with a small pop. `error` wins if both are set. */
  success?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  blurOnComplete?: boolean;

  /* Style overrides */
  containerStyle?: StyleProp<ViewStyle>;
  cellStyle?: StyleProp<ViewStyle>;
  activeCellStyle?: StyleProp<ViewStyle>;
  filledCellStyle?: StyleProp<ViewStyle>;
  errorCellStyle?: StyleProp<ViewStyle>;
  successCellStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;

  /** Render each box yourself. */
  renderCell?: (state: OtpCellState) => React.ReactNode;
  /** Extra props for the hidden TextInput. */
  textInputProps?: Omit<TextInputProps, "value" | "onChangeText" | "maxLength">;
  testID?: string;
}
