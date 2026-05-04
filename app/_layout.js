import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity, View } from "react-native";

export default function Layout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#F9FAFB",
        },
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 16,
          color: "#111827",
        },
        headerShadowVisible: false,

        headerRight: () => (
          <View style={{ flexDirection: "row", marginRight: 10 }}>
            <TouchableOpacity
              onPress={() => router.replace("/")}
              style={styles.homeBtn}
            >
              <Ionicons name="home" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Dashboard" }} />
      <Stack.Screen name="capture" options={{ title: "Capture Reading" }} />
      <Stack.Screen name="rateScreen" options={{ title: "Rate Screen" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
      <Stack.Screen
        name="calculation"
        options={{ title: "Rate Calculation" }}
      />
      <Stack.Screen name="meter-input" options={{ title: "Meter Reading" }} />
      <Stack.Screen name="meterListScreen" options={{ title: "Meter List" }} />
      <Stack.Screen name="addMeterScreen" options={{ title: " Meter" }} />
    </Stack>
  );
}

const styles = {
  homeBtn: {
    backgroundColor: "#6366F1",
    padding: 8,
    borderRadius: 10,
  },
};
