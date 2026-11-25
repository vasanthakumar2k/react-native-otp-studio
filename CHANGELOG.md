# Changelog

## 1.1.0

Everything new is opt-in. Existing props keep their defaults, so current apps behave the same.

### Added
- `success`, `successColor`, `successCellStyle`: green "code accepted" state with a small pop.
- `onVerify`: optional async verify step. Pauses typing while it runs, never sends the same code twice in a row, and shows success or error from the result.
- `completeDelay`: wait before `onComplete` / `onVerify`.
- `maskDelay`: show the last typed character briefly before masking it.
- `vibrateOnError`: vibrate when `error` turns true (React Native `Vibration`, no dependency).
- `entryAnimation`: `"pop"` or `"fade"` for each typed character.
- `preset`: `"dark"`, `"minimal"`, `"neon"`.
- `OtpResendTimer` component, `useOtpTimer` hook and `formatOtpTime`.
- `isSuccess` in `OtpCellState` for `renderCell`.
- GitHub Actions: CI on every push, publish to npm on version tags.

### Fixed
- Digits now always run left to right on RTL (Arabic, Hebrew, Urdu) devices.
- Typing a character no longer re-renders every box, only the ones that changed.

## 1.0.2

### Fixed
- Glass effect on Android: no more dark inner square from `elevation` showing through the translucent fill. The half-height shine overlay is replaced by a brighter top rim.

## 1.0.0

- First release.
