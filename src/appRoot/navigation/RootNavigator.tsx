import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { RouteNames } from "./routes";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from "../../features/auth/screens/LoginScreen";
import QuickCaptureScreen from "../../features/tasks/screens/QuickCaptureScreen";
import TaskDetailsScreen from "../../features/tasks/screens/TaskDetailsScreen";
import CameraCaptureScreen from "../../features/camera/screens/CameraCaptureScreen";
import MainTabsNavigator from "./MainTabsNavigator";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { useTheme } from "../../core/theme/ThemeProvider";
import TaskReviewScreen from "../../features/tasks/screens/TaskReviewScreen";

export type RootStackParamList = {
  [RouteNames.Login]: undefined;
  [RouteNames.MainTabs]: undefined;
  [RouteNames.QuickCapture]: { selectedDateIso?: string } | undefined;
  [RouteNames.CameraCapture]: { selectedDateIso?: string } | undefined;
  [RouteNames.TaskReview]: { imageUri?: string; rawText?: string; selectedDateIso?: string };
  [RouteNames.TaskDetails]: { taskId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isSessionChecked, restoreSession } = useAuthStore();
  const { colors } = useTheme();

  useEffect(() => {
    restoreSession();
  }, []);

  if (!isSessionChecked) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={user ? RouteNames.MainTabs : RouteNames.Login}
          screenOptions={{ headerShown: false }}
        >
        <Stack.Screen name={RouteNames.CameraCapture} component={CameraCaptureScreen} />
        <Stack.Screen name={RouteNames.TaskReview} component={TaskReviewScreen} />
        {!user ? (
          <Stack.Screen name={RouteNames.Login} component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name={RouteNames.MainTabs} component={MainTabsNavigator} />
            <Stack.Screen name={RouteNames.QuickCapture} component={QuickCaptureScreen} />
            <Stack.Screen name={RouteNames.TaskDetails} component={TaskDetailsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
}
