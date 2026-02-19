import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";

import DashboardScreen from "../../features/tasks/screens/DashboardScreen";
import ReviewScreen from "../../features/tasks/screens/ReviewScreen";
import QuickCaptureScreen from "../../features/tasks/screens/QuickCaptureScreen";
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

export default function MainTabsNavigator() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = "home";

          if (route.name === RouteNames.Dashboard) {
            iconName = focused ? "dashboard" : "dashboard";
          } else if (route.name === RouteNames.Review) {
            iconName = focused ? "checklist" : "checklist";
          } else if (route.name === RouteNames.QuickCapture) {
            iconName = "add-circle";
          } else if (route.name === RouteNames.Settings) {
            iconName = focused ? "tune" : "tune";
          } else if (route.name === RouteNames.Profile) {
            iconName = focused ? "account-circle" : "account-circle";
          }

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
