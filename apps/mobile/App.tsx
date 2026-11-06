import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import {
  CreateAccountScreen,
  RegisterFormScreen,
} from './src/screens/CreateAccountScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { VenueDetailScreen } from './src/screens/VenueDetailScreen';
import { PartnerInboxScreen } from './src/screens/PartnerInboxScreen';
import {
  PartnerVenuesScreen,
  PartnerVenueDetailScreen,
} from './src/screens/PartnerVenuesScreen';
import { MainTabs } from './src/navigation/MainTabs';
import type { RootStackParamList } from './src/navigation/types';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.sand,
        }}
      >
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={token ? 'MainTabs' : 'Welcome'}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="RegisterForm" component={RegisterFormScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
      <Stack.Screen name="PartnerInbox" component={PartnerInboxScreen} />
      <Stack.Screen name="PartnerVenues" component={PartnerVenuesScreen} />
      <Stack.Screen
        name="PartnerVenueDetail"
        component={PartnerVenueDetailScreen}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
