import React, { useEffect } from 'react';
import { useFileStore } from './src/store/fileStore';
import './src/i18n'; // Initialize i18n
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, View, StyleSheet, TouchableOpacity, InteractionManager } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient'; // Added LinearGradient
import { ToastManager } from './src/services/ToastManager';
import { COLORS, SHADOWS } from './src/theme'; // Updated imports
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { AdService } from './src/services/AdService';

// Screens
import Onboarding from './src/screens/Onboarding';
import Home from './src/screens/Home';
import Connect from './src/screens/Connect';
import Transfer from './src/screens/Transfer';
import ReceiveScreen from './src/screens/ReceiveScreen';
import JoinScreen from './src/screens/JoinScreen';
import ScanScreen from './src/screens/ScanScreen';
import FileBrowser from './src/screens/FileBrowser';
import Settings from './src/screens/Settings';
import History from './src/screens/History';
import { useTranslation } from 'react-i18next';
import ConnectionStatusBar from './src/components/modern/ConnectionStatusBar';
import { useConnectionStore } from './src/store/connectionStore';
import PermissionsManager from './src/services/PermissionsManager';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Tab Bar Component for full control over layout
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 10), height: 75 + insets.bottom }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          // ⏱️ PERFORMANCE: Log navigation timing
          const navStartTime = Date.now();
          console.log(`[NAVIGATION] ▶️ Navigating to "${route.name}" at ${new Date().toISOString()}`);

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
            // Log after navigation call
            requestAnimationFrame(() => {
              console.log(`[NAVIGATION] ✅ "${route.name}" completed in ${Date.now() - navStartTime}ms`);
            });
          }
        };

        // Center Button (Transfer) logic
        if (route.name === 'ConnectTab') {
          return (
            <View key={index} style={styles.centerButtonWrapper}>
              <LinearGradient
                colors={COLORS.gradientPrimary}
                style={styles.centerButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TouchableOpacity onPress={onPress} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="swap-vert" size={32} color="#FFF" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          );
        }

        // Standard Icons
        let iconName = 'home';
        let iconColor = isFocused ? COLORS.primary : COLORS.textDim;

        if (route.name === 'HomeTab') { iconName = 'home'; iconColor = isFocused ? COLORS.primary : COLORS.textDim; }
        else if (route.name === 'FilesTab') { iconName = 'folder'; iconColor = isFocused ? COLORS.secondary : COLORS.textDim; }
        else if (route.name === 'HistoryTab') { iconName = 'history'; iconColor = isFocused ? COLORS.tertiary : COLORS.textDim; }
        else if (route.name === 'SettingsTab') { iconName = 'settings'; iconColor = isFocused ? COLORS.warning : COLORS.textDim; }

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
          >
            <View style={[styles.iconContainer, isFocused && styles.iconActive]}>
              <Icon name={iconName} size={28} color={iconColor} />
              {isFocused && <View style={[styles.activeDot, { backgroundColor: iconColor }]} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}>
      <Tab.Screen name="HomeTab" component={Home} />
      <Tab.Screen name="FilesTab" component={FileBrowser} />
      <Tab.Screen name="ConnectTab" component={Connect} />
      <Tab.Screen name="HistoryTab" component={History} />
      <Tab.Screen name="SettingsTab" component={Settings} />
    </Tab.Navigator>
  );
}

// Wrapper component to add ConnectionStatusBar above tabs (only when connected or connecting)
function MainTabsWithStatus({ navigation }: any) {
  const { isConnected, isConnecting, isGroupOwner } = useConnectionStore();

  return (
    <View style={{ flex: 1, backgroundColor: '#05103A' }}>
      <View style={{ alignItems: 'center', backgroundColor: 'transparent' }}>
        <BannerAd
          unitId={'ca-app-pub-8298073076766088/2978008663'} // Production Banner ID
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
      </View>
      {(isConnected || isConnecting || isGroupOwner) && (
        <View style={{ paddingTop: 40 }}>
          <ConnectionStatusBar
            onPress={() => {
              if (isGroupOwner) {
                navigation.navigate('ReceiveScreen');
              } else {
                navigation.navigate('ConnectTab');
              }
            }}
          />
        </View>
      )}
      <MainTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 30, 0.98)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    // Professional Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  centerButtonWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 101,
    top: -20,
    // Remove pointerEvents to allow clicks
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    ...SHADOWS.glow,
    elevation: 10, // Shadow for Android
  }
});



function App() {
  useEffect(() => {
    const appStartTime = Date.now();
    console.log('[APP] ⏱️ App useEffect START at', new Date().toISOString());

    const initApp = async () => {
      console.log('[APP] ⏱️ initApp() called at +' + (Date.now() - appStartTime) + 'ms');

      // 1. Request permissions immediately on mount
      const permStartTime = Date.now();
      const status = await PermissionsManager.requestMediaPermissionsOnly();
      console.log('[APP] ⏱️ Permission check took', (Date.now() - permStartTime) + 'ms, status:', status);

      // 2. Set permission state IMMEDIATELY (UI can react)
      if (status === 'granted') {
        useFileStore.getState().setPermissionGranted(true);
      } else {
        useFileStore.getState().setPermissionGranted(false);
      }

      console.log('[APP] ⏱️ Permission state set, UI should be visible now');

      // 3. DEFER ALL DATA FETCHING - Let UI render first!
      // Using setTimeout(0) to push to next event loop tick
      setTimeout(() => {
        console.log('[APP] ⏱️ Deferred fetch starting at +' + (Date.now() - appStartTime) + 'ms');
        if (status === 'granted') {
          useFileStore.getState().initialize();
        } else {
          useFileStore.getState().fetchApps();
        }
      }, 0);
    };

    initApp();

    // Initialize AdMob
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('📱 AdMob Initialized', adapterStatuses);
        // Preload ads
        AdService.loadInterstitial();
      });

    console.log('[APP] ⏱️ initApp() returned (async) at +' + (Date.now() - appStartTime) + 'ms');
  }, []);

  return (
    <ToastManager>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
          <NavigationContainer theme={{
            ...DefaultTheme,
            colors: {
              ...DefaultTheme.colors,
              background: 'transparent',
            },
          }}>
            <Stack.Navigator
              initialRouteName="Main"
              screenOptions={{
                headerShown: false,
              }}>
              <Stack.Screen name="Onboarding" component={Onboarding} />
              <Stack.Screen name="Main" component={MainTabsWithStatus} />
              <Stack.Screen name="ReceiveScreen" component={ReceiveScreen} />
              <Stack.Screen name="JoinScreen" component={JoinScreen} />
              <Stack.Screen name="ScanScreen" component={ScanScreen} />
              <Stack.Screen name="FileBrowser" component={FileBrowser} />
              {/* Add TransferTab here as a full screen modal/stack item */}
              <Stack.Screen name="Transfer" component={Transfer} options={{ gestureEnabled: false }} />
            </Stack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ToastManager>
  );
}

export default App;
