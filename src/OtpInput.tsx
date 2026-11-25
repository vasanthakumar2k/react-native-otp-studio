import * as React from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type {
  OtpCellState,
  OtpEntryAnimation,
  OtpInputProps,
  OtpInputRef,
  OtpPosition,
  OtpPreset,
  OtpShadow,
  OtpShape,
} from "./types";
import { createTransformer, createValidator, groupBoundaries, keyboardTypeFor, sanitize } from "./utils";

const DEFAULTS = {
  textColor: "#111827",
  backgroundColor: "#FFFFFF",
  borderColor: "#D1D5DB",
  activeBorderColor: "#6366F1",
  errorColor: "#EF4444",
  successColor: "#16A34A",
  placeholderTextColor: "#9CA3AF",
};

const DEFAULT_SHADOW: Required<OtpShadow> = {
  color: "#000000",
  opacity: 0.12,
  radius: 8,
  offset: { width: 0, height: 4 },
  elevation: 4,
};

const PRESETS: Record<OtpPreset, Partial<OtpInputProps>> = {
  dark: {
    textColor: "#F9FAFB",
    backgroundColor: "#1F2937",
    borderColor: "#374151",
    activeBorderColor: "#A5B4FC",
    placeholderTextColor: "#6B7280",
  },
  minimal: {
    shape: "underline",
    textColor: "#111827",
    borderColor: "#D1D5DB",
    activeBorderColor: "#111827",
  },
  neon: {
    textColor: "#E0F2FE",
    backgroundColor: "#0B0F1A",
    borderColor: "#1E293B",
    activeBorderColor: "#22D3EE",
    placeholderTextColor: "#334155",
    activeGlow: true,
  },
};

/** Preset values fill in only the props you did not pass. */
function applyPreset(props: OtpInputProps): OtpInputProps {
  if (!props.preset || !PRESETS[props.preset]) return props;
  const out: Record<string, unknown> = { ...PRESETS[props.preset] };
  for (const [k, v] of Object.entries(props)) if (v !== undefined) out[k] = v;
  return out as OtpInputProps;
}

const JUSTIFY: Record<OtpPosition, ViewStyle["justifyContent"]> = {
  center: "center",
  left: "flex-start",
  right: "flex-end",
  "space-between": "space-between",
  "space-around": "space-around",
  "space-evenly": "space-evenly",
};

function shapeDimensions(shape: OtpShape, size: number) {
  switch (shape) {
    case "square":
      return { width: size, height: size, radius: 0 };
    case "circle":
      return { width: size, height: size, radius: size / 2 };
    case "pill":
      return { width: Math.round(size * 0.8), height: Math.round(size * 1.2), radius: size };
    case "underline":
      return { width: Math.round(size * 0.85), height: size, radius: 0 };
    case "rounded":
    default:
      return { width: size, height: size, radius: Math.round(size * 0.24) };
  }
}

function shadowStyle(shadow: OtpShadow): ViewStyle {
  const s = { ...DEFAULT_SHADOW, ...shadow };
  return {
    shadowColor: s.color,
    shadowOpacity: s.opacity,
    shadowRadius: s.radius,
    shadowOffset: s.offset,
    elevation: s.elevation,
  };
}

function Cursor({ color, height }: { color: string; height: number }) {
  const opacity = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, delay: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      testID="otp-cursor"
      style={{ width: 2, height, borderRadius: 1, backgroundColor: color, opacity }}
    />
  );
}

/** Everything a cell needs that is the same for every cell. Memoised so cells can skip re-renders. */
interface CellConfig {
  width: number;
  height: number;
  radius: number;
  bw: number;
  isUnderline: boolean;
  bg: string;
  activeBg?: string;
  filledBg?: string;
  border: string;
  activeBorder: string;
  filledBorder?: string;
  errorColor: string;
  successColor: string;
  rim: string | null;
  overflow: ViewStyle | null;
  shadow: ViewStyle | null;
  noElevation: boolean;
  activeGlow: boolean;
  disabled: boolean;
  cellStyle: StyleProp<ViewStyle>;
  filledCellStyle: StyleProp<ViewStyle>;
  activeCellStyle: StyleProp<ViewStyle>;
  errorCellStyle: StyleProp<ViewStyle>;
  successCellStyle: StyleProp<ViewStyle>;
  text: StyleProp<TextStyle>;
  placeholderColor: string;
  showCursor: boolean;
  cursorColor: string;
  cursorHeight: number;
  animated: boolean;
  entryAnimation: OtpEntryAnimation;
  glass: React.ReactNode;
}

interface CellProps {
  displayChar: string;
  isActive: boolean;
  isFilled: boolean;
  hasError: boolean;
  isSuccess: boolean;
  placeholder?: string;
  cfg: CellConfig;
  testID?: string;
}

const Cell = React.memo(function Cell({
  displayChar,
  isActive,
  isFilled,
  hasError,
  isSuccess,
  placeholder,
  cfg,
  testID,
}: CellProps) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const entry = React.useRef(new Animated.Value(1)).current;
  const mounted = React.useRef(false);

  React.useEffect(() => {
    if (!cfg.animated) return;
    Animated.spring(scale, {
      toValue: isActive ? 1.06 : 1,
      friction: 6,
      tension: 160,
      useNativeDriver: true,
    }).start();
  }, [cfg.animated, isActive, scale]);

  React.useEffect(() => {
    if (!cfg.animated || !isSuccess) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.1, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [cfg.animated, isSuccess, scale]);

  // Entry animation runs only when a box goes from empty to filled, not on first mount.
  React.useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (first || !isFilled || cfg.entryAnimation === "none") return;
    entry.setValue(0);
    (cfg.entryAnimation === "pop"
      ? Animated.spring(entry, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true })
      : Animated.timing(entry, { toValue: 1, duration: 200, useNativeDriver: true })
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFilled]);

  let border = cfg.border;
  if (isFilled && cfg.filledBorder) border = cfg.filledBorder;
  if (isActive) border = cfg.activeBorder;
  if (isSuccess) border = cfg.successColor;
  if (hasError) border = cfg.errorColor;

  let bg = cfg.bg;
  if (isFilled && cfg.filledBg) bg = cfg.filledBg;
  if (isActive && cfg.activeBg) bg = cfg.activeBg;

  const glow: ViewStyle | null =
    cfg.activeGlow && isActive
      ? {
          shadowColor: hasError ? cfg.errorColor : cfg.activeBorder,
          shadowOpacity: 0.45,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
          elevation: cfg.noElevation ? 0 : 6,
        }
      : null;

  const boxStyle: StyleProp<ViewStyle> = [
    styles.cell,
    { width: cfg.width, height: cfg.height, backgroundColor: bg, borderRadius: cfg.radius },
    cfg.isUnderline
      ? { borderBottomWidth: isActive ? cfg.bw + 1 : cfg.bw, borderColor: border }
      : { borderWidth: cfg.bw, borderColor: border },
    cfg.rim && border === cfg.border ? { borderTopColor: cfg.rim } : null,
    cfg.overflow,
    cfg.shadow,
    cfg.noElevation ? { elevation: 0 } : null,
    glow,
    cfg.disabled ? { opacity: 0.5 } : null,
    cfg.cellStyle,
    isFilled ? cfg.filledCellStyle : null,
    isActive ? cfg.activeCellStyle : null,
    isSuccess ? cfg.successCellStyle : null,
    hasError ? cfg.errorCellStyle : null,
  ];

  const entryStyle =
    cfg.entryAnimation === "pop"
      ? { transform: [{ scale: entry.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }
      : cfg.entryAnimation === "fade"
        ? { opacity: entry, transform: [{ translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }
        : null;

  return (
    <Animated.View testID={testID} style={[boxStyle, cfg.animated ? { transform: [{ scale }] } : null]}>
      {cfg.glass}
      {isFilled ? (
        entryStyle ? (
          <Animated.Text style={[cfg.text, entryStyle]} allowFontScaling={false}>
            {displayChar}
          </Animated.Text>
        ) : (
          <Text style={cfg.text} allowFontScaling={false}>
            {displayChar}
          </Text>
        )
      ) : isActive && cfg.showCursor && !cfg.disabled ? (
        <Cursor color={hasError ? cfg.errorColor : cfg.cursorColor} height={cfg.cursorHeight} />
      ) : placeholder ? (
        <Text style={[cfg.text, { color: cfg.placeholderColor }]} allowFontScaling={false}>
          {placeholder}
        </Text>
      ) : null}
    </Animated.View>
  );
});

export const OtpInput = React.forwardRef<OtpInputRef, OtpInputProps>(function OtpInput(rawProps, ref) {
  const props = applyPreset(rawProps);
  const {
    length = 6,
    value: controlledValue,
    defaultValue,
    onChange,
    onComplete,
    onVerify,
    completeDelay = 0,
    onFocus,
    onBlur,
    type = "numeric",
    transform = "none",
    mask = false,
    maskDelay = 0,
    shape = "rounded",
    size = 52,
    cellWidth,
    cellHeight,
    gap = 10,
    borderRadius,
    borderWidth,
    position = "center",
    textColor,
    backgroundColor,
    activeBackgroundColor,
    filledBackgroundColor,
    borderColor,
    activeBorderColor = DEFAULTS.activeBorderColor,
    filledBorderColor,
    errorColor = DEFAULTS.errorColor,
    successColor = DEFAULTS.successColor,
    cursorColor,
    placeholderTextColor,
    shadow = false,
    activeGlow = false,
    glassEffect = false,
    glassTint = "light",
    glassOpacity = 0.18,
    BlurComponent,
    blurIntensity = 30,
    fontSize,
    fontWeight = "600",
    fontFamily,
    placeholder,
    showCursor = true,
    animated = true,
    shakeOnError = true,
    vibrateOnError = false,
    entryAnimation = "none",
    separator,
    groups,
    error = false,
    success = false,
    disabled = false,
    autoFocus = false,
    blurOnComplete = false,
    containerStyle,
    cellStyle,
    activeCellStyle,
    filledCellStyle,
    errorCellStyle,
    successCellStyle,
    textStyle,
    renderCell,
    textInputProps,
    testID = "otp-input",
  } = props;

  if (!Number.isInteger(length) || length < 1) {
    throw new Error("react-native-otp-studio: `length` must be a positive integer");
  }

  const isValid = React.useMemo(() => createValidator(type), [type]);
  const transformChar = React.useMemo(() => createTransformer(transform), [transform]);
  const clean = React.useCallback((t: string) => sanitize(t, length, isValid, transformChar), [length, isValid, transformChar]);
  const maskChar = mask === true ? "•" : typeof mask === "string" ? mask : null;

  const [internal, setInternal] = React.useState(() => clean(controlledValue ?? defaultValue ?? ""));
  const value = controlledValue !== undefined ? clean(controlledValue) : internal;
  const [focused, setFocused] = React.useState(false);
  const [revealIndex, setRevealIndex] = React.useState(-1);
  const [verifyResult, setVerifyResult] = React.useState<boolean | null>(null);
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
  const shakeX = React.useRef(new Animated.Value(0)).current;

  const cb = React.useRef({ onChange, onComplete, onVerify });
  cb.current = { onChange, onComplete, onVerify };
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const alive = React.useRef(true);
  const verifying = React.useRef(false);
  const verifiedCode = React.useRef<string | null>(null);
  const completeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revealTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(completeTimer.current);
      clearTimeout(revealTimer.current);
    };
  }, []);

  const runComplete = React.useCallback(
    (code: string) => {
      cb.current.onComplete?.(code);
      if (blurOnComplete) inputRef.current?.blur();
      const verify = cb.current.onVerify;
      if (!verify || verifying.current || code === verifiedCode.current) return;
      verifiedCode.current = code;
      verifying.current = true;
      Promise.resolve()
        .then(() => verify(code))
        .then(
          (ok) => {
            if (alive.current && valueRef.current === code) setVerifyResult(ok === true ? true : ok === false ? false : null);
          },
          () => {
            verifiedCode.current = null; // let the user retry after a network error
            if (alive.current && valueRef.current === code) setVerifyResult(false);
          },
        )
        .finally(() => {
          verifying.current = false;
        });
    },
    [blurOnComplete],
  );

  const commit = React.useCallback(
    (next: string) => {
      const prev = valueRef.current;
      if (next === prev) return;
      valueRef.current = next;
      if (controlledValue === undefined) setInternal(next);
      setVerifyResult(null);
      if (next.length === 0) verifiedCode.current = null;
      if (maskChar && maskDelay > 0) {
        clearTimeout(revealTimer.current);
        if (next.length > prev.length) {
          setRevealIndex(next.length - 1);
          revealTimer.current = setTimeout(() => alive.current && setRevealIndex(-1), maskDelay);
        } else {
          setRevealIndex(-1);
        }
      }
      cb.current.onChange?.(next);
      clearTimeout(completeTimer.current);
      if (next.length === length) {
        if (completeDelay > 0) {
          completeTimer.current = setTimeout(() => {
            if (alive.current && valueRef.current === next) runComplete(next);
          }, completeDelay);
        } else {
          runComplete(next);
        }
      }
    },
    [controlledValue, length, maskChar, maskDelay, completeDelay, runComplete],
  );

  const focus = React.useCallback(() => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    // Android: re-open the keyboard if it was dismissed while the input kept focus.
    if (Platform.OS === "android" && input.isFocused?.()) {
      input.blur();
      setTimeout(() => input.focus(), 50);
    } else {
      input.focus();
    }
  }, [disabled]);

  React.useImperativeHandle(
    ref,
    () => ({
      focus,
      blur: () => inputRef.current?.blur(),
      clear: () => commit(""),
      setValue: (v: string) => commit(clean(v)),
      getValue: () => valueRef.current,
    }),
    [focus, commit, clean],
  );

  const hasError = error || verifyResult === false;
  const isSuccess = !hasError && (success || verifyResult === true);

  // Shake (and optionally vibrate) on error.
  React.useEffect(() => {
    if (!hasError) return;
    if (vibrateOnError) Vibration.vibrate(typeof vibrateOnError === "number" ? vibrateOnError : 60);
    if (!shakeOnError) return;
    const step = (to: number) => Animated.timing(shakeX, { toValue: to, duration: 50, useNativeDriver: true });
    Animated.sequence([step(10), step(-10), step(8), step(-8), step(4), step(0)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasError, shakeOnError, shakeX]);

  // ---- styles ----
  const isUnderline = shape === "underline";
  const dims = shapeDimensions(shape, size);
  const width = cellWidth ?? dims.width;
  const height = cellHeight ?? dims.height;
  const radius = borderRadius ?? dims.radius;
  const bw = borderWidth ?? (isUnderline ? 2 : 1.5);
  const resolvedFontSize = fontSize ?? Math.round(Math.min(width, height) * 0.42);

  const glassFill =
    glassTint === "dark" ? `rgba(17,24,39,${Math.min(1, glassOpacity + 0.2)})` : `rgba(255,255,255,${glassOpacity})`;
  const glassBorder = glassTint === "dark" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.45)";

  const baseText = textColor ?? (glassEffect && glassTint === "dark" ? "#FFFFFF" : DEFAULTS.textColor);
  const baseBg = backgroundColor ?? (glassEffect ? glassFill : isUnderline ? "transparent" : DEFAULTS.backgroundColor);
  const baseBorder = borderColor ?? (glassEffect ? glassBorder : DEFAULTS.borderColor);
  const resolvedCursor = cursorColor ?? activeBorderColor;
  const resolvedPlaceholder = placeholderTextColor ?? (glassEffect ? "rgba(255,255,255,0.6)" : DEFAULTS.placeholderTextColor);

  // Android draws `elevation` shadows behind the view, so they show through a
  // translucent glass fill as a dark inner square. Glass cells skip elevation on Android.
  const noElevation = glassEffect && Platform.OS === "android";
  // Subtle brighter top rim gives the glass its shine without an extra overlay layer.
  const rim =
    glassEffect && !isUnderline && borderColor == null
      ? glassTint === "dark"
        ? "rgba(255,255,255,0.32)"
        : "rgba(255,255,255,0.75)"
      : null;

  const glass = React.useMemo(
    () =>
      glassEffect && BlurComponent ? (
        <BlurComponent
          style={StyleSheet.absoluteFill}
          intensity={blurIntensity}
          blurAmount={Math.round(blurIntensity / 3)}
          tint={glassTint}
          blurType={glassTint}
        />
      ) : null,
    [glassEffect, BlurComponent, blurIntensity, glassTint],
  );

  const cfg = React.useMemo<CellConfig>(() => {
    const shadowObj: OtpShadow | null =
      shadow === true ? DEFAULT_SHADOW : shadow || (glassEffect && !noElevation ? { opacity: 0.12, radius: 12, elevation: 0 } : null);
    return {
      width,
      height,
      radius,
      bw,
      isUnderline,
      bg: baseBg,
      activeBg: activeBackgroundColor,
      filledBg: filledBackgroundColor,
      border: baseBorder,
      activeBorder: activeBorderColor,
      filledBorder: filledBorderColor,
      errorColor,
      successColor,
      rim,
      overflow: glassEffect || BlurComponent ? { overflow: Platform.OS === "android" ? "hidden" : "visible" } : null,
      shadow: shadowObj && !isUnderline ? shadowStyle(shadowObj) : null,
      noElevation,
      activeGlow,
      disabled,
      cellStyle,
      filledCellStyle,
      activeCellStyle,
      errorCellStyle,
      successCellStyle,
      text: [
        {
          color: baseText,
          fontSize: maskChar ? resolvedFontSize * 1.1 : resolvedFontSize,
          fontWeight,
          fontFamily,
          textAlign: "center",
          includeFontPadding: false,
        },
        textStyle,
      ],
      placeholderColor: resolvedPlaceholder,
      showCursor,
      cursorColor: resolvedCursor,
      cursorHeight: Math.round(resolvedFontSize * 1.1),
      animated,
      entryAnimation,
      glass,
    };
  }, [
    width, height, radius, bw, isUnderline, baseBg, activeBackgroundColor, filledBackgroundColor, baseBorder,
    activeBorderColor, filledBorderColor, errorColor, successColor, rim, glassEffect, BlurComponent, shadow,
    noElevation, activeGlow, disabled, cellStyle, filledCellStyle, activeCellStyle, errorCellStyle, successCellStyle,
    baseText, maskChar, resolvedFontSize, fontWeight, fontFamily, textStyle, resolvedPlaceholder, showCursor,
    resolvedCursor, animated, entryAnimation, glass,
  ]);

  const placeholderChars = placeholder ? Array.from(placeholder) : [];
  const placeholderFor = (i: number) =>
    placeholderChars.length === length ? placeholderChars[i] : placeholderChars.length ? placeholder : undefined;

  const chars = Array.from(value);
  const activeIndex = focused ? Math.min(chars.length, length - 1) : -1;
  const boundaries = groupBoundaries(groups, length);

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < length; i++) {
    const char = chars[i] ?? "";
    const state: OtpCellState = {
      index: i,
      char,
      displayChar: char && maskChar && i !== revealIndex ? maskChar : char,
      isActive: activeIndex === i,
      isFilled: !!char,
      hasError,
      isSuccess,
    };

    cells.push(
      <React.Fragment key={i}>
        {renderCell ? (
          renderCell(state)
        ) : (
          <Cell
            testID={`${testID}-cell-${i}`}
            displayChar={state.displayChar}
            isActive={state.isActive}
            isFilled={state.isFilled}
            hasError={hasError}
            isSuccess={isSuccess}
            placeholder={placeholderFor(i)}
            cfg={cfg}
          />
        )}
        {i < length - 1 && separator != null && (!boundaries || boundaries.has(i)) ? (
          <View testID={`${testID}-separator`} style={styles.separator}>
            {typeof separator === "string" || typeof separator === "number" ? (
              <Text style={{ color: baseText, fontSize: resolvedFontSize * 0.8 }}>{separator}</Text>
            ) : (
              separator
            )}
          </View>
        ) : null}
      </React.Fragment>,
    );
  }

  return (
    <Animated.View style={[{ transform: [{ translateX: shakeX }] }, containerStyle]} testID={testID}>
      <Pressable
        onPress={focus}
        disabled={disabled}
        accessible={false}
        style={[styles.row, { justifyContent: JUSTIFY[position], columnGap: gap }]}
      >
        {cells}
      </Pressable>
      <TextInput
        ref={inputRef}
        testID={`${testID}-hidden`}
        value={value}
        onChangeText={(t) => {
          // While onVerify runs, ignore typing; re-render so the native text snaps back.
          if (verifying.current) return forceRender();
          commit(clean(t));
        }}
        maxLength={length}
        keyboardType={keyboardTypeFor(type)}
        inputMode={type === "numeric" ? "numeric" : "text"}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        autoCapitalize={transform === "uppercase" ? "characters" : "none"}
        autoCorrect={false}
        spellCheck={false}
        secureTextEntry={false}
        autoFocus={autoFocus && !disabled}
        editable={!disabled}
        caretHidden
        contextMenuHidden={false}
        accessibilityLabel={`One-time code, ${length} characters`}
        importantForAutofill="yes"
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        style={styles.hiddenInput}
        {...textInputProps}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    // OTP codes always read left to right, even on RTL (Arabic, Hebrew, Urdu) devices.
    direction: "ltr",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    color: "transparent",
  },
});
