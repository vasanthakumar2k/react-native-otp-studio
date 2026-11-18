import * as React from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { OtpCellState, OtpInputProps, OtpInputRef, OtpPosition, OtpShadow, OtpShape } from "./types";
import { createTransformer, createValidator, groupBoundaries, keyboardTypeFor, sanitize } from "./utils";

const DEFAULTS = {
  textColor: "#111827",
  backgroundColor: "#FFFFFF",
  borderColor: "#D1D5DB",
  activeBorderColor: "#6366F1",
  errorColor: "#EF4444",
  placeholderTextColor: "#9CA3AF",
};

const DEFAULT_SHADOW: Required<OtpShadow> = {
  color: "#000000",
  opacity: 0.12,
  radius: 8,
  offset: { width: 0, height: 4 },
  elevation: 4,
};

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

interface CellProps {
  state: OtpCellState;
  style: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  placeholder?: string;
  placeholderColor: string;
  cursor: React.ReactNode;
  animated: boolean;
  glass: React.ReactNode;
  testID?: string;
}

function Cell({ state, style, textStyle, placeholder, placeholderColor, cursor, animated, glass, testID }: CellProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!animated) return;
    Animated.spring(scale, {
      toValue: state.isActive ? 1.06 : 1,
      friction: 6,
      tension: 160,
      useNativeDriver: true,
    }).start();
  }, [animated, state.isActive, scale]);

  return (
    <Animated.View testID={testID} style={[style, animated ? { transform: [{ scale }] } : null]}>
      {glass}
      {state.isFilled ? (
        <Text style={textStyle} allowFontScaling={false}>
          {state.displayChar}
        </Text>
      ) : state.isActive && cursor ? (
        cursor
      ) : placeholder ? (
        <Text style={[textStyle, { color: placeholderColor }]} allowFontScaling={false}>
          {placeholder}
        </Text>
      ) : null}
    </Animated.View>
  );
}

export const OtpInput = React.forwardRef<OtpInputRef, OtpInputProps>(function OtpInput(props, ref) {
  const {
    length = 6,
    value: controlledValue,
    defaultValue,
    onChange,
    onComplete,
    onFocus,
    onBlur,
    type = "numeric",
    transform = "none",
    mask = false,
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
    separator,
    groups,
    error = false,
    disabled = false,
    autoFocus = false,
    blurOnComplete = false,
    containerStyle,
    cellStyle,
    activeCellStyle,
    filledCellStyle,
    errorCellStyle,
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

  const [internal, setInternal] = React.useState(() => clean(controlledValue ?? defaultValue ?? ""));
  const value = controlledValue !== undefined ? clean(controlledValue) : internal;
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
  const shakeX = React.useRef(new Animated.Value(0)).current;

  const cb = React.useRef({ onChange, onComplete });
  cb.current = { onChange, onComplete };
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const commit = React.useCallback(
    (next: string) => {
      if (next === valueRef.current) return;
      valueRef.current = next;
      if (controlledValue === undefined) setInternal(next);
      cb.current.onChange?.(next);
      if (next.length === length) {
        cb.current.onComplete?.(next);
        if (blurOnComplete) inputRef.current?.blur();
      }
    },
    [controlledValue, length, blurOnComplete],
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

  // Shake on error.
  React.useEffect(() => {
    if (!error || !shakeOnError) return;
    const step = (to: number) => Animated.timing(shakeX, { toValue: to, duration: 50, useNativeDriver: true });
    Animated.sequence([step(10), step(-10), step(8), step(-8), step(4), step(0)]).start();
  }, [error, shakeOnError, shakeX]);

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
  const shadowObj: OtpShadow | null =
    shadow === true ? DEFAULT_SHADOW : shadow || (glassEffect && !noElevation ? { opacity: 0.12, radius: 12, elevation: 0 } : null);
  // Subtle brighter top rim gives the glass its shine without an extra overlay layer.
  const glassRim = glassTint === "dark" ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.75)";

  const placeholderChars = placeholder ? Array.from(placeholder) : [];
  const placeholderFor = (i: number) =>
    placeholderChars.length === length ? placeholderChars[i] : placeholderChars.length ? placeholder : undefined;

  const maskChar = mask === true ? "•" : typeof mask === "string" ? mask : null;
  const chars = Array.from(value);
  const activeIndex = focused ? Math.min(chars.length, length - 1) : -1;
  const boundaries = groupBoundaries(groups, length);

  const text: StyleProp<TextStyle> = [
    {
      color: baseText,
      fontSize: maskChar ? resolvedFontSize * 1.1 : resolvedFontSize,
      fontWeight,
      fontFamily,
      textAlign: "center",
      includeFontPadding: false,
    },
    textStyle,
  ];

  const glassLayer =
    glassEffect && BlurComponent ? (
      <BlurComponent
        style={StyleSheet.absoluteFill}
        intensity={blurIntensity}
        blurAmount={Math.round(blurIntensity / 3)}
        tint={glassTint}
        blurType={glassTint}
      />
    ) : null;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < length; i++) {
    const char = chars[i] ?? "";
    const state: OtpCellState = {
      index: i,
      char,
      displayChar: char && maskChar ? maskChar : char,
      isActive: activeIndex === i,
      isFilled: !!char,
      hasError: error,
    };

    let currentBorder = baseBorder;
    if (state.isFilled && filledBorderColor) currentBorder = filledBorderColor;
    if (state.isActive) currentBorder = activeBorderColor;
    if (error) currentBorder = errorColor;

    let currentBg = baseBg;
    if (state.isFilled && filledBackgroundColor) currentBg = filledBackgroundColor;
    if (state.isActive && activeBackgroundColor) currentBg = activeBackgroundColor;

    const glow: ViewStyle | null =
      activeGlow && state.isActive
        ? {
            shadowColor: error ? errorColor : activeBorderColor,
            shadowOpacity: 0.45,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            elevation: noElevation ? 0 : 6,
          }
        : null;
    const showRim = glassEffect && !isUnderline && borderColor == null && currentBorder === baseBorder;

    const boxStyle: StyleProp<ViewStyle> = [
      styles.cell,
      {
        width,
        height,
        backgroundColor: currentBg,
        borderRadius: radius,
      },
      isUnderline
        ? { borderBottomWidth: state.isActive ? bw + 1 : bw, borderColor: currentBorder }
        : { borderWidth: bw, borderColor: currentBorder },
      showRim ? { borderTopColor: glassRim } : null,
      glassEffect || BlurComponent ? { overflow: Platform.OS === "android" ? "hidden" : "visible" } : null,
      shadowObj && !isUnderline ? shadowStyle(shadowObj) : null,
      noElevation ? { elevation: 0 } : null,
      glow,
      disabled ? { opacity: 0.5 } : null,
      cellStyle,
      state.isFilled ? filledCellStyle : null,
      state.isActive ? activeCellStyle : null,
      error ? errorCellStyle : null,
    ];

    cells.push(
      <React.Fragment key={i}>
        {renderCell ? (
          renderCell(state)
        ) : (
          <Cell
            testID={`${testID}-cell-${i}`}
            state={state}
            style={boxStyle}
            textStyle={text}
            placeholder={placeholderFor(i)}
            placeholderColor={resolvedPlaceholder}
            cursor={showCursor && !disabled ? <Cursor color={error ? errorColor : resolvedCursor} height={Math.round(resolvedFontSize * 1.1)} /> : null}
            animated={animated}
            glass={glassLayer}
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
        onChangeText={(t) => commit(clean(t))}
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
