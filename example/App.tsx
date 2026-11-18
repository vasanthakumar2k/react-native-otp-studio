// Drop this into an Expo / React Native app to try every style:
//   npx create-expo-app otp-demo && cd otp-demo
//   npm install react-native-otp-studio
//   replace App.tsx with this file, then: npx expo start
import * as React from "react";
import { ImageBackground, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { OtpInput, type OtpInputRef } from "react-native-otp-studio";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

export default function App() {
  const ref = React.useRef<OtpInputRef>(null);
  const [error, setError] = React.useState(false);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Section title="Rounded (default)">
          <OtpInput autoFocus onComplete={(c) => console.log(c)} />
        </Section>

        <Section title="Square + shadow">
          <OtpInput shape="square" shadow />
        </Section>

        <Section title="Circle, 4 digits, purple glow">
          <OtpInput length={4} shape="circle" size={60} activeBorderColor="#8B5CF6" activeGlow />
        </Section>

        <Section title="Pill">
          <OtpInput shape="pill" filledBackgroundColor="#EEF2FF" />
        </Section>

        <Section title="Underline (Instagram / Telegram)">
          <OtpInput shape="underline" activeBorderColor="#0EA5E9" />
        </Section>

        <Section title="Alphanumeric, uppercase, 3-3 groups">
          <OtpInput type="alphanumeric" transform="uppercase" groups={[3, 3]} separator="-" />
        </Section>

        <Section title="Masked PIN">
          <OtpInput length={4} mask shape="circle" />
        </Section>

        <Section title="Error + shake (enter anything except 123456)">
          <OtpInput
            ref={ref}
            error={error}
            onChange={() => setError(false)}
            onComplete={(c) => {
              if (c !== "123456") {
                setError(true);
                setTimeout(() => ref.current?.clear(), 600);
              }
            }}
          />
        </Section>

        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=900" }}
          style={styles.glassBg}
          imageStyle={{ borderRadius: 20 }}
        >
          <Text style={[styles.title, { color: "#fff" }]}>Glass effect</Text>
          <OtpInput glassEffect textColor="#fff" activeBorderColor="#fff" />
          <View style={{ height: 16 }} />
          <OtpInput glassEffect glassTint="dark" shape="circle" length={4} />
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  title: { fontSize: 14, fontWeight: "600", marginBottom: 12, color: "#374151" },
  glassBg: { padding: 20, borderRadius: 20, overflow: "hidden" },
});
