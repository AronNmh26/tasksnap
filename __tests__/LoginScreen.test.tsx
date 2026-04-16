import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import LoginScreen from "../src/features/auth/screens/LoginScreen";
import { RouteNames } from "../src/appRoot/navigation/routes";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const Icon = () => null;
  return { FontAwesome: Icon, MaterialIcons: Icon };
});

const mockAuthStore = {
  login: jest.fn(),
  signup: jest.fn(),
  resetPassword: jest.fn(),
  loginAsGuest: jest.fn(),
  loginWithGoogle: jest.fn(),
  loginWithGooglePopup: jest.fn(),
  loginWithFacebook: jest.fn(),
  loginWithFacebookPopup: jest.fn(),
  isLoading: false,
  error: null,
  clearError: jest.fn(),
};

jest.mock("../src/features/auth/store/useAuthStore", () => ({
  useAuthStore: () => mockAuthStore,
}));

jest.mock("../src/services/googleAuth", () => ({
  isExpoGo: false,
  configureNativeGoogleSignIn: jest.fn(),
  nativeSignIn: jest.fn(),
  isNativeGoogleAvailable: () => false,
  expoGoSignIn: jest.fn(),
}));

jest.mock("../src/services/facebookAuth", () => ({
  facebookSignIn: jest.fn(),
}));

jest.mock("../src/core/ui/AppLogo", () => () => null);

jest.mock("../src/core/theme/ThemeProvider", () => {
  const { lightColors } = require("../src/core/theme/theme");
  return {
    useTheme: () => ({
      colors: lightColors,
      mode: "light",
      setMode: jest.fn(),
    }),
  };
});

describe("LoginScreen", () => {
  it("requires privacy consent before signup", () => {
    const navigation = { replace: jest.fn(), navigate: jest.fn() };
    const route = { key: RouteNames.Login, name: RouteNames.Login, params: undefined };

    const { getByText, queryByText, getByTestId } = render(
      <LoginScreen navigation={navigation as any} route={route as any} />
    );

    expect(queryByText("I agree to the Privacy Policy")).toBeNull();

    fireEvent.press(getByText("Sign up free"));

    expect(getByText("I agree to the Privacy Policy")).toBeTruthy();
    expect(getByTestId("auth_submit_button")).toBeDisabled();

    fireEvent.press(getByTestId("privacy_consent_toggle"));
    expect(getByTestId("auth_submit_button")).toBeEnabled();
  });
});
