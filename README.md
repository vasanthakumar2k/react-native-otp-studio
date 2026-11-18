# react-native-otp-studio

[![npm](https://img.shields.io/npm/v/react-native-otp-studio.svg)](https://www.npmjs.com/package/react-native-otp-studio)
[![license](https://img.shields.io/npm/l/react-native-otp-studio.svg)](LICENSE)
![platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Expo-blue)
![deps](https://img.shields.io/badge/dependencies-0-brightgreen)

Beautiful, customizable **OTP input for React Native**. Choose circle, square, rounded, pill or Instagram/Telegram-style underline boxes. Add a glass effect, colors and shadows. Use numeric, alphanumeric or masked codes. SMS autofill works on iOS and Android.

**Lightweight:** zero dependencies, pure JS, TypeScript included. Works with **Expo** and bare React Native.

```tsx
<OtpInput length={6} shape="circle" glassEffect onComplete={verify} />
```

## Features

- 🔢 **Any length:** `length={4}`, `6`, `8`…
- 🔷 **Shapes:** `square` · `rounded` · `circle` · `pill` · `underline`
- 🧊 **Glass effect:** `glassEffect` (light / dark tint, optional real blur)
- 🎨 **Colors:** text, background, border, active, filled, error, cursor, placeholder
- 🌑 **Shadows:** `shadow` (iOS shadow + Android elevation) and `activeGlow`
- 📍 **Position:** `center`, `left`, `right`, `space-between`, `space-around`, `space-evenly`
- 🔤 **Types:** `numeric`, `alpha`, `alphanumeric`, `hex`, `any`, custom RegExp or function
- 🙈 **Mask:** `mask` (•) or `mask="*"`
- ✨ **Animations:** active box pop, blinking cursor, shake on error
- 📩 **SMS autofill:** iOS `oneTimeCode`, Android `sms-otp`; paste works too
- ➖ **Separators and groups:** `123 - 456`
- 🧩 **Fully custom:** style props per state, or `renderCell`

## Install

```bash
npm install react-native-otp-studio
# or
yarn add react-native-otp-studio
```

No native linking and no pod install. It works in Expo Go.

## Usage

```tsx
import { OtpInput } from "react-native-otp-studio";

export default function VerifyScreen() {
  return (
    <OtpInput
      length={6}
      autoFocus
      onComplete={(code) => console.log("OTP:", code)}
    />
  );
}
```

### Shapes

```tsx
<OtpInput shape="square" />
<OtpInput shape="rounded" />   // default
<OtpInput shape="circle" />
<OtpInput shape="pill" />
<OtpInput shape="underline" /> // Instagram / Telegram style line
```

### Glass effect

```tsx
// Pure JS glass, no extra dependency (best over an image or gradient background)
<OtpInput glassEffect />
<OtpInput glassEffect glassTint="dark" glassOpacity={0.25} />

// Real blur: pass any blur view you already use
import { BlurView } from "expo-blur";
<OtpInput glassEffect BlurComponent={BlurView} blurIntensity={40} />
```

### Colors and shadow

```tsx
<OtpInput
  shape="circle"
  textColor="#111827"
  backgroundColor="#F9FAFB"
  borderColor="#E5E7EB"
  activeBorderColor="#8B5CF6"
  filledBorderColor="#A78BFA"
  errorColor="#EF4444"
  cursorColor="#8B5CF6"
  shadow={{ color: "#8B5CF6", opacity: 0.2, radius: 10, offset: { width: 0, height: 6 }, elevation: 5 }}
  activeGlow
/>
```

### Size and position

```tsx
<OtpInput length={4} size={64} gap={16} position="space-evenly" />
<OtpInput cellWidth={44} cellHeight={56} borderRadius={10} borderWidth={2} />
```

### Types

```tsx
<OtpInput type="numeric" />                              // 0-9 (default, number pad)
<OtpInput type="alpha" />                                // a-z A-Z
<OtpInput type="alphanumeric" transform="uppercase" />   // A7K2Q9
<OtpInput type="hex" />
<OtpInput type="any" />
<OtpInput type={/^[A-F0-5]$/} />                         // custom RegExp (one char)
<OtpInput type={(c) => "XYZ".includes(c)} />             // custom function
<OtpInput mask />                                        // ••••
<OtpInput mask="*" />                                    // ****
```

### Groups and separators

```tsx
<OtpInput length={6} groups={[3, 3]} separator="-" />    // 123 - 456
<OtpInput length={4} separator={<Dot />} />               // between every box
```

### Error, controlled value, ref

```tsx
const [code, setCode] = useState("");
const [error, setError] = useState(false);
const otpRef = useRef<OtpInputRef>(null);

<OtpInput
  ref={otpRef}
  value={code}
  onChange={(v) => { setCode(v); setError(false); }}
  onComplete={async (v) => {
    const ok = await verify(v);
    if (!ok) { setError(true); otpRef.current?.clear(); }
  }}
  error={error}          // red borders + shake
/>

otpRef.current?.focus();
otpRef.current?.blur();
otpRef.current?.clear();
otpRef.current?.setValue("123456");
otpRef.current?.getValue();
```

### Full custom cell

```tsx
<OtpInput
  renderCell={({ index, displayChar, isActive, isFilled }) => (
    <View key={index} style={[myStyles.box, isActive && myStyles.active]}>
      <Text>{displayChar}</Text>
    </View>
  )}
/>
```

## Props

| Prop | Type | Default |
| --- | --- | --- |
| `length` | `number` | `6` |
| `value` / `defaultValue` | `string` | |
| `onChange` | `(value: string) => void` | |
| `onComplete` | `(value: string) => void` | |
| `onFocus` / `onBlur` | `() => void` | |
| `type` | `"numeric" \| "alpha" \| "alphanumeric" \| "hex" \| "any" \| RegExp \| (c) => boolean` | `"numeric"` |
| `transform` | `"none" \| "uppercase" \| "lowercase" \| (c) => string` | `"none"` |
| `mask` | `boolean \| string` | `false` |
| `shape` | `"square" \| "rounded" \| "circle" \| "pill" \| "underline"` | `"rounded"` |
| `size` | `number` | `52` |
| `cellWidth` / `cellHeight` | `number` | from shape |
| `gap` | `number` | `10` |
| `borderRadius` | `number` | from shape |
| `borderWidth` | `number` | `1.5` (`2` underline) |
| `position` | `"center" \| "left" \| "right" \| "space-between" \| "space-around" \| "space-evenly"` | `"center"` |
| `textColor` | `string` | `#111827` |
| `backgroundColor` | `string` | `#FFFFFF` (transparent for underline) |
| `activeBackgroundColor` / `filledBackgroundColor` | `string` | |
| `borderColor` | `string` | `#D1D5DB` |
| `activeBorderColor` | `string` | `#6366F1` |
| `filledBorderColor` | `string` | |
| `errorColor` | `string` | `#EF4444` |
| `cursorColor` | `string` | `activeBorderColor` |
| `placeholderTextColor` | `string` | `#9CA3AF` |
| `shadow` | `boolean \| { color, opacity, radius, offset, elevation }` | `false` |
| `activeGlow` | `boolean` | `false` |
| `glassEffect` | `boolean` | `false` |
| `glassTint` | `"light" \| "dark"` | `"light"` |
| `glassOpacity` | `number` (0–1) | `0.18` |
| `BlurComponent` | `ComponentType` | |
| `blurIntensity` | `number` | `30` |
| `fontSize` / `fontWeight` / `fontFamily` | | auto / `"600"` |
| `placeholder` | `string` (one char, or one per box) | |
| `showCursor` | `boolean` | `true` |
| `animated` | `boolean` | `true` |
| `shakeOnError` | `boolean` | `true` |
| `separator` | `ReactNode` | |
| `groups` | `number[]` | |
| `error` / `disabled` / `autoFocus` / `blurOnComplete` | `boolean` | `false` |
| `containerStyle` / `cellStyle` / `activeCellStyle` / `filledCellStyle` / `errorCellStyle` / `textStyle` | style | |
| `renderCell` | `(state) => ReactNode` | |
| `textInputProps` | `TextInputProps` | |
| `testID` | `string` | `"otp-input"` |

## Notes

- **Android shadows** need a non-transparent `backgroundColor` to show up. This is a React Native limitation.
- **Glass effect** looks best over an image or gradient. On a plain white screen, use `glassTint="dark"` or pass a `BlurComponent`.
- **SMS autofill:** iOS shows the code above the keyboard automatically. On Android, Google's SMS suggestions fill it on most devices.

## License

MIT © [Vasanthakumar A](mailto:2002vasanthakumar@gmail.com)
