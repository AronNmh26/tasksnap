import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { RouteNames } from "./routes";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from "../../features/auth/screens/LoginScreen";
import ForgotPasswordScreen from "../../features/auth/screens/ForgotPasswordScreen";
import QuickCaptureScreen from "../../features/tasks/screens/QuickCaptureScreen";
import TaskDetailsScreen from "../../features/tasks/screens/TaskDetailsScreen";
import CameraCaptureScreen from "../../features/camera/screens/CameraCaptureScreen";
import MainTabsNavigator from "./MainTabsNavigator";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { useTheme } from "../../core/theme/ThemeProvider";
import TaskReviewScreen from "../../features/tasks/screens/TaskReviewScreen";
import PrivacyPolicyScreen from "../../features/legal/screens/PrivacyPolicyScreen";
import HelpFaqScreen from "../../features/support/screens/HelpFaqScreen";
import PrivacyConsentScreen from "../../features/legal/screens/PrivacyConsentScreen";
import { hasAcceptedCurrentPrivacyPolicy, savePrivacyPolicyConsent } from "../../features/legal/privacyConsent";

export type RootStackParamList = {
  [RouteNames.PrivacyConsent]: undefined;
  [RouteNames.Login]: undefined;
  [RouteNames.ForgotPassword]: { email?: string } | undefined;
  [RouteNames.MainTabs]: undefined;
  [RouteNames.QuickCapture]: { selectedDateIso?: string } | undefined;
  [RouteNames.CameraCapture]: { selectedDateIso?: string } | undefined;
  [RouteNames.TaskReview]: { imageUri?: string; rawText?: string; selectedDateIso?: string };
  [RouteNames.TaskDetails]: { taskId: string };
  [RouteNames.PrivacyPolicy]: undefined;
  [RouteNames.HelpFaq]: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isSessionChecked, restoreSession } = useAuthStore();
  const { colors } = useTheme();
  const [consentChecked, setConsentChecked] = React.useState(false);
  const [consentAccepted, setConsentAccepted] = React.useState(false);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    hasAcceptedCurrentPrivacyPolicy()
      .then((accepted) => {
        setConsentAccepted(accepted);
      })
      .finally(() => setConsentChecked(true));
  }, []);

  const handleAcceptedPrivacyPolicy = async () => {
    await savePrivacyPolicyConsent();
    setConsentAccepted(true);
  };

  const entryRoute = !consentAccepted
    ? RouteNames.PrivacyConsent
    : user
      ? RouteNames.MainTabs
      : RouteNames.Login;

  if (!isSessionChecked || !consentChecked) {
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
          key={`gate-${consentAccepted ? "accepted" : "pending"}-${user ? "authed" : "guest"}`}
          initialRouteName={entryRoute}
          screenOptions={{ headerShown: false }}
        >
        <Stack.Screen name={RouteNames.PrivacyPolicy} component={PrivacyPolicyScreen} />
        <Stack.Screen name={RouteNames.HelpFaq} component={HelpFaqScreen} />
        {!consentAccepted ? (
          <Stack.Screen
            name={RouteNames.PrivacyConsent}
            options={{ gestureEnabled: false }}
          >
            {() => <PrivacyConsentScreen onAccepted={handleAcceptedPrivacyPolicy} />}
          </Stack.Screen>
        ) : !user ? (
          <>
            <Stack.Screen name={RouteNames.Login} component={LoginScreen} />
            <Stack.Screen name={RouteNames.ForgotPassword} component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name={RouteNames.MainTabs} component={MainTabsNavigator} />
            <Stack.Screen name={RouteNames.QuickCapture} component={QuickCaptureScreen} />
            <Stack.Screen name={RouteNames.TaskDetails} component={TaskDetailsScreen} />
            <Stack.Screen name={RouteNames.CameraCapture} component={CameraCaptureScreen} />
            <Stack.Screen name={RouteNames.TaskReview} component={TaskReviewScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
}
