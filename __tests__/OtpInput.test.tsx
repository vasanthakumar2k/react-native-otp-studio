import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import { render, fireEvent, act, screen } from "@testing-library/react-native";
import { OtpInput, type OtpInputRef } from "../src";

const hidden = () => screen.getByTestId("otp-input-hidden");
const cellText = (i: number) => {
  const cell = screen.getByTestId(`otp-input-cell-${i}`);
  const texts = cell.findAll((n: any) => n.type === "Text" && typeof n.props.children === "string");
  return texts.length ? texts[0].props.children : "";
};
const shown = (n: number) => Array.from({ length: n }, (_, i) => cellText(i)).join("");
const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

describe("OtpInput", () => {
  it("renders `length` cells (default 6)", () => {
    render(<OtpInput />);
    expect(screen.getAllByTestId(/otp-input-cell-/)).toHaveLength(6);
    render(<OtpInput length={4} testID="four" />);
    expect(screen.getAllByTestId(/four-cell-/)).toHaveLength(4);
  });

  it("types numeric digits and fires onComplete once full", () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    render(<OtpInput length={4} onChange={onChange} onComplete={onComplete} />);
    fireEvent.changeText(hidden(), "12");
    expect(onChange).toHaveBeenLastCalledWith("12");
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.changeText(hidden(), "1234");
    expect(onComplete).toHaveBeenCalledWith("1234");
    expect(shown(4)).toBe("1234");
  });

  it("filters invalid characters and trims to length (paste / SMS autofill)", () => {
    const onChange = jest.fn();
    render(<OtpInput length={6} onChange={onChange} />);
    fireEvent.changeText(hidden(), "Your code: 123-456 789");
    expect(onChange).toHaveBeenLastCalledWith("123456");
  });

  it.each([
    [{ type: "alpha" as const }, "a1b2cd", "abcd"],
    [{ type: "alphanumeric" as const, transform: "uppercase" as const }, "a1-b2", "A1B2"],
    [{ type: "hex" as const }, "fgz09a", "f09a"],
    [{ type: /^[A-C]$/ }, "ABXDC", "ABC"],
    [{ type: (c: string) => "xy".includes(c) }, "xaybx", "xyx"],
    [{ type: "any" as const }, "a 1#", "a1#"],
  ])("type %o", (props, typed, expected) => {
    const onChange = jest.fn();
    render(<OtpInput length={4} onChange={onChange} {...props} />);
    fireEvent.changeText(hidden(), typed);
    expect(onChange).toHaveBeenLastCalledWith(expected);
  });

  it("uses number-pad keyboard and OTP autofill hints", () => {
    render(<OtpInput />);
    expect(hidden().props.keyboardType).toBe("number-pad");
    expect(hidden().props.textContentType).toBe("oneTimeCode");
    expect(hidden().props.maxLength).toBe(6);
  });

  it("mask=true shows dots, custom mask char works", () => {
    render(<OtpInput length={4} mask defaultValue="12" />);
    expect(shown(4)).toBe("••");
    render(<OtpInput length={4} mask="*" defaultValue="99" testID="m" />);
    const c = screen.getByTestId("m-cell-0").findAll((n: any) => n.type === "Text");
    expect(c[0].props.children).toBe("*");
  });

  it("works as a controlled input", () => {
    function C() {
      const [v, setV] = React.useState("");
      return (
        <>
          <OtpInput length={4} value={v} onChange={setV} />
          <Text testID="out">{v}</Text>
          <Text testID="reset" onPress={() => setV("")}>reset</Text>
        </>
      );
    }
    render(<C />);
    fireEvent.changeText(hidden(), "42");
    expect(screen.getByTestId("out").props.children).toBe("42");
    fireEvent.press(screen.getByTestId("reset"));
    expect(shown(4)).toBe("");
  });

  it.each([
    ["square", 52, 52, 0],
    ["rounded", 52, 52, 12],
    ["circle", 52, 52, 26],
    ["pill", 42, 62, 52],
  ] as const)("shape %s sizes the cell", (shape, w, h, r) => {
    render(<OtpInput length={1} shape={shape} />);
    const s = flat("otp-input-cell-0");
    expect([s.width, s.height, s.borderRadius]).toEqual([w, h, r]);
    expect(s.borderWidth).toBe(1.5);
  });

  it("underline shape draws only a bottom line on a transparent background", () => {
    render(<OtpInput length={1} shape="underline" />);
    const s = flat("otp-input-cell-0");
    expect(s.borderBottomWidth).toBe(2);
    expect(s.borderWidth).toBeUndefined();
    expect(s.backgroundColor).toBe("transparent");
  });

  it("applies custom colours, size and active colour on focus", () => {
    render(<OtpInput length={2} size={60} borderColor="#111" activeBorderColor="#0f0" backgroundColor="#eee" />);
    expect(flat("otp-input-cell-0")).toMatchObject({ width: 60, borderColor: "#111", backgroundColor: "#eee" });
    fireEvent(hidden(), "focus");
    expect(flat("otp-input-cell-0").borderColor).toBe("#0f0");
    expect(screen.getByTestId("otp-cursor")).toBeTruthy();
  });

  it("shadow={true} and custom shadow", () => {
    render(<OtpInput length={1} shadow />);
    expect(flat("otp-input-cell-0")).toMatchObject({ shadowOpacity: 0.12, elevation: 4 });
    render(<OtpInput length={1} shadow={{ color: "#f00", opacity: 0.5, elevation: 9 }} testID="s" />);
    expect(flat("s-cell-0")).toMatchObject({ shadowColor: "#f00", shadowOpacity: 0.5, elevation: 9 });
  });

  it("glassEffect gives translucent cells and uses a BlurComponent when given", () => {
    const Blur = (p: any) => <View testID="blur" {...p} />;
    render(<OtpInput length={2} glassEffect BlurComponent={Blur} />);
    expect(flat("otp-input-cell-0").backgroundColor).toBe("rgba(255,255,255,0.18)");
    expect(screen.getAllByTestId("blur")).toHaveLength(2);
  });

  it("glass cells never use elevation on Android", () => {
    const { Platform } = require("react-native");
    const prev = Platform.OS;
    Platform.OS = "android";
    try {
      render(<OtpInput length={1} glassEffect shadow activeGlow autoFocus />);
      expect(flat("otp-input-cell-0").elevation ?? 0).toBe(0);
    } finally {
      Platform.OS = prev;
    }
  });

  it("dark glass uses light text", () => {
    render(<OtpInput length={1} glassEffect glassTint="dark" defaultValue="5" />);
    const t = screen.getByTestId("otp-input-cell-0").findAll((n: any) => n.type === "Text")[0];
    expect(StyleSheet.flatten(t.props.style).color).toBe("#FFFFFF");
  });

  it("position maps to justifyContent", () => {
    const { UNSAFE_root } = render(<OtpInput length={2} position="space-between" />);
    const row = UNSAFE_root.findAll((n: any) => StyleSheet.flatten(n.props.style)?.justifyContent === "space-between");
    expect(row.length).toBeGreaterThan(0);
  });

  it("error uses the error colour", () => {
    render(<OtpInput length={1} error errorColor="#f00" />);
    expect(flat("otp-input-cell-0").borderColor).toBe("#f00");
  });

  it("separators between groups or every cell", () => {
    render(<OtpInput length={6} groups={[3, 3]} separator="-" />);
    expect(screen.getAllByTestId("otp-input-separator")).toHaveLength(1);
    render(<OtpInput length={4} separator="·" testID="all" />);
    expect(screen.getAllByTestId("all-separator")).toHaveLength(3);
  });

  it("placeholder per cell", () => {
    render(<OtpInput length={3} placeholder="abc" />);
    expect(shown(3)).toBe("abc");
  });

  it("disabled makes the input non-editable", () => {
    render(<OtpInput disabled />);
    expect(hidden().props.editable).toBe(false);
  });

  it("ref: setValue, getValue, clear", () => {
    const ref = React.createRef<OtpInputRef>();
    render(<OtpInput length={4} ref={ref} />);
    act(() => ref.current!.setValue("12ab34"));
    expect(ref.current!.getValue()).toBe("1234");
    expect(shown(4)).toBe("1234");
    act(() => ref.current!.clear());
    expect(shown(4)).toBe("");
  });

  it("renderCell gives full control", () => {
    render(<OtpInput length={3} defaultValue="7" renderCell={(s) => <Text key={s.index} testID={`c${s.index}`}>{s.char || "_"}</Text>} />);
    expect(screen.getByTestId("c0").props.children).toBe("7");
    expect(screen.getByTestId("c2").props.children).toBe("_");
  });
});
