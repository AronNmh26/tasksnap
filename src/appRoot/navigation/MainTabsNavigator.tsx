import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";

import DashboardScreen from "../../features/tasks/screens/DashboardScreen";
import ReviewScreen from "../../features/tasks/screens/ReviewScreen";
import CameraCaptureScreen from "../../features/camera/screens/CameraCaptureScreen";
import SettingsScreen from "../../features/settings/screens/SettingsScreen";
import ProfileScreen from "../../features/home/screens/ProfileScreen";

import { RouteNames } from "./routes";
import { ThemeColors, spacing } from "../../core/theme/theme";
import { useTheme } from "../../core/theme/ThemeProvider";

export type MainTabsParamList = {
  [RouteNames.Dashboard]: undefined;
  [RouteNames.Review]: undefined;
  [RouteNames.QuickCapture]: undefined;
  [RouteNames.Settings]: undefined;
  [RouteNames.Profile]: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICONS: Record<keyof MainTabsParamList, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  [RouteNames.Dashboard]: "dashboard",
  [RouteNames.Review]: "checklist",
  [RouteNames.QuickCapture]: "add-circle",
  [RouteNames.Settings]: "tune",
  [RouteNames.Profile]: "account-circle",
};

export default function MainTabsNavigator() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const iconName = TAB_ICONS[route.name as keyof MainTabsParamList];

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      })}
    >
      <Tab.Screen
        name={RouteNames.Dashboard}
        component={DashboardScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name={RouteNames.Review}
        component={ReviewScreen}
        options={{ title: "Tasks" }}
      />
      <Tab.Screen
        name={RouteNames.QuickCapture}
        component={CameraCaptureScreen}
        options={{
          title: "Capture",
          tabBarIconStyle: { marginTop: 4 },
        }}
      />
      <Tab.Screen
        name={RouteNames.Settings}
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
      <Tab.Screen
        name={RouteNames.Profile}
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: colors.surfaceAlt,
      borderTopWidth: 1,
      borderTopColor: colors.borderGlass,
      paddingBottom: 8,
      paddingTop: 8,
      height: 64,
    },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
    tabBarItem: {
      paddingVertical: 8,
    },
  });
