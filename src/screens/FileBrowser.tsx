import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SectionList, ActivityIndicator, Image, TextInput, ScrollView, Dimensions, Alert, BackHandler, Linking, AppState, InteractionManager, Platform, I18nManager, Animated } from 'react-native';
// LegendList: Pure JS High Performance List
import { LegendList as LegendListOriginal } from '@legendapp/list';
const LegendList = LegendListOriginal as unknown as React.FC<any>;
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'; // Native Tabs

import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS, SIZES, SHADOWS } from '../theme';
import AppManager from '../services/AppManager';
import FileSystem from '../services/FileSystem';
import SAFService, { SAFFileInfo } from '../services/SAFService';
import PermissionsManager from '../services/PermissionsManager';
import WiFiDirectService from '../services/WiFiDirect';
import { showToast } from '../services/ToastManager';
import { useConnectionStore } from '../store/connectionStore';
import { useFileStore } from '../store/fileStore'; // Global Store
import { useTransferStore } from '../store/transferStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import mobileAds, { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

// Modern Components
import AppBackground from '../components/modern/AppBackground';
import GlassCard from '../components/modern/GlassCard';
import NeoButton from '../components/modern/NeoButton';
import GameResourceModal from '../components/GameResourceModal';
import { FileBrowserSkeleton, GridSkeleton } from '../components/skeletons/FileBrowserSkeleton'; // Skeletons

// Separate Tab Components (each subscribes to own data only)
import AppsTab from '../components/tabs/AppsTab';
import PhotosTab from '../components/tabs/PhotosTab';
import VideosTab from '../components/tabs/VideosTab';
import MusicTab from '../components/tabs/MusicTab';

const { width } = Dimensions.get('window');

const TAB_CONFIG = [
    { id: 'Apps', label: 'common.apps', icon: 'android' },
    { id: 'Photos', label: 'common.photos', icon: 'image' },
    { id: 'Videos', label: 'common.videos', icon: 'play-circle-filled' },
    { id: 'Music', label: 'common.music', icon: 'music-note' },
    { id: 'Dashboard', label: 'common.files', icon: 'grid-view' }, // Moved to end
];

const Tab = createMaterialTopTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation, position, t }: any) => {
    const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
    const tabCount = state.routes.length;
    const tabWidth = containerWidth / tabCount;
    const isRTL = I18nManager.isRTL;

    // 2024 BEST PRACTICE: RTL-aware movement
    // In LTR: Higher index = more positive translateX (moves Right)
    // In RTL: Higher index = more negative translateX (moves Left relative to Right edge)
    // React Native flips 'left: 0' to 'right: 0' in RTL, so we start at physical Right.
    const translateX = position.interpolate({
        inputRange: state.routes.map((_: any, i: number) => i),
        outputRange: state.routes.map((_: any, i: number) => {
            const val = i * tabWidth;
            return isRTL ? -val : val;
        }),
    });

    return (
        <View style={styles.tabsWrapper}>
            <View
                style={styles.tabsContainer}
                onLayout={(e) => {
                    const { width } = e.nativeEvent.layout;
                    if (width > 0) setContainerWidth(width);
                }}
            >
                {/* Animated Indicator - slides smoothly during swipe */}
                <Animated.View
                    style={[
                        styles.animatedIndicator,
                        {
                            width: tabWidth,
                            transform: [{ translateX }],
                        }
                    ]}
                >
                    <View style={styles.indicatorLine} />
                </Animated.View>

                {/* Tab Items */}
                {state.routes.map((route: any, index: number) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            style={styles.tabItem}
                            onPress={onPress}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
                                {t(label)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// --- Attractive Package Folder Component ---
const PackageFolder = React.memo(({ item, selected, onNavigate, onLongPress, t }: any) => {
    const [metadata, setMetadata] = useState<{ icon: string, label: string } | null>(null);

    useEffect(() => {
        let mounted = true;
        FileSystem.getAppMetadata(item.packageName).then((meta: any) => {
            if (mounted && meta) setMetadata(meta);
        }).catch(() => { });
        return () => { mounted = false; };
    }, [item.packageName]);

    return (
        <TouchableOpacity
            onPress={() => onNavigate(item.path)}
            onLongPress={() => onLongPress(item)}
        >
            <View style={[styles.fileRow, selected && styles.selectedFileRow]}>
                <View style={styles.packageIconContainer}>
                    <View style={[styles.fileIcon, { backgroundColor: 'rgba(255, 200, 0, 0.1)', marginRight: 0 }]}>
                        <Icon name="folder" size={24} color="#FFC107" />
                    </View>
                    {metadata?.icon && (
                        <View style={styles.appIconOverlay}>
                            <Image source={{ uri: metadata.icon }} style={styles.smallAppIcon} />
                        </View>
                    )}
                </View>
                <View style={[styles.listInfo, { marginLeft: 12 }]}>
                    <Text style={[styles.itemTitle, selected && { color: COLORS.secondary }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.itemSub}>{t('common.folder')} • </Text>
                        <Text style={styles.itemSub}>{new Date(item.dateModified * 1000).toLocaleDateString()}</Text>
                    </View>
                </View>
                {selected ? (
                    <Icon name="check-circle" size={20} color={COLORS.secondary} />
                ) : (
                    <Icon name="chevron-right" size={20} color={COLORS.textDim} />
                )}
            </View>
            <View style={styles.divider} />
        </TouchableOpacity>
    );
});


// --- Dynamic File Icon with Thumbnail Support ---
const DynamicFileIcon = React.memo(({ filename, path, isDir, iconConfig }: any) => {
    const [thumbnail, setThumbnail] = useState<string | null>(null);

    useEffect(() => {
        if (isDir) return;

        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const supported = ['apk', 'jpg', 'jpeg', 'png', 'webp', 'mp4', 'mkv', 'avi', 'mov', 'mp3', 'wav', 'm4a'].includes(ext);

        if (!supported) return;

        let isMounted = true;
        // Small delay to allow fast scrolling without heavy native calls
        const timer = setTimeout(async () => {
            try {
                const result = await FileSystem.getFileThumbnail(path);
                if (isMounted && result) {
                    setThumbnail(result);
                }
            } catch (e) { }
        }, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [path, filename, isDir]);

    if (thumbnail) {
        return (
            <View style={[styles.fileIcon, { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' }]}>
                <Image
                    source={{ uri: thumbnail }}
                    style={{ width: '100%', height: '100%', borderRadius: 6 }}
                    resizeMode="cover"
                />
            </View>
        );
    }

    return (
        <View style={[styles.fileIcon, { backgroundColor: iconConfig.bg }]}>
            <Icon name={iconConfig.name} size={24} color={iconConfig.color} />
        </View>
    );
});


// --- Generic Dynamic Thumbnail for Media Tabs ---
// FIX: Reset thumbnail when path changes to prevent recycled items showing wrong images
const DynamicThumbnail = React.memo(({ path, fallbackIcon, fallbackColor, style }: any) => {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [currentPath, setCurrentPath] = useState<string | null>(null);

    useEffect(() => {
        // CRITICAL FIX: Reset thumbnail immediately when path changes
        // This prevents recycled list items from showing the previous item's thumbnail
        if (path !== currentPath) {
            setThumbnail(null);
            setCurrentPath(path);
        }

        let isMounted = true;
        FileSystem.getFileThumbnail(path).then((result: any) => {
            if (isMounted && result) setThumbnail(result);
        }).catch(() => { });
        return () => { isMounted = false; };
    }, [path, currentPath]);

    return (
        <View style={[style, { overflow: 'hidden' }]}>
            {thumbnail ? (
                <Image
                    source={{ uri: thumbnail }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <Icon name={fallbackIcon} size={24} color={fallbackColor} />
                </View>
            )}
        </View>
    );
});

// --- Universal File Icon Helper ---
const getFileIcon = (filename: string, isDirectory: boolean) => {
    if (isDirectory) return { name: 'folder', color: '#FFC107', bg: 'rgba(255, 200, 0, 0.1)' };

    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // APKs
    if (ext === 'apk') return { name: 'android', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)' };

    // Videos
    if (['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv'].includes(ext)) {
        return { name: 'play-circle-filled', color: '#FF5252', bg: 'rgba(255, 82, 82, 0.1)' };
    }

    // Music
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
        return { name: 'music-note', color: '#E91E63', bg: 'rgba(233, 30, 99, 0.1)' };
    }

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
        return { name: 'image', color: '#2196F3', bg: 'rgba(33, 150, 243, 0.1)' };
    }

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return { name: 'inventory-2', color: '#FF9800', bg: 'rgba(255, 152, 0, 0.1)' };
    }

    // Documents
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) {
        return { name: 'description', color: '#607D8B', bg: 'rgba(96, 125, 139, 0.1)' };
    }

    // Fallback
    return { name: 'insert-drive-file', color: COLORS.textDim, bg: 'rgba(255, 255, 255, 0.05)' };
};

// --- Helper Functions ---
const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDuration = (ms: number) => {
    if (!ms) return '';
    const date = new Date(ms);
    return date.toISOString().substr(14, 5);
};

const FileBrowser = ({ navigation, route }: any) => {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const isRTL = i18n.language === 'ar' || i18n.dir() === 'rtl';
    const effectiveDirection = (I18nManager.isRTL === isRTL) ? 'row' : 'row-reverse';
    const [isBannerLoaded, setIsBannerLoaded] = useState(false);

    // State to track the desired initial tab (will trigger re-render)
    const [activeTabKey, setActiveTabKey] = useState(route.params?.initialTab || 'Apps');
    const [tabTimestamp, setTabTimestamp] = useState(route.params?.t || 0); // Track timestamp for remount
    const tabNavigationRef = useRef<any>(null); // Ref to store Tab.Navigator's navigation


    // CONNECT TO GLOBAL STORE - Use SELECTORS to prevent unnecessary re-renders
    // Each selector only triggers re-render when its specific data changes
    const apps = useFileStore(state => state.apps);
    const photos = useFileStore(state => state.photos);
    const videos = useFileStore(state => state.videos);
    const music = useFileStore(state => state.music);
    const dashboardCounts = useFileStore(state => state.dashboardCounts);
    const isPermissionGranted = useFileStore(state => state.isPermissionGranted);
    const setPermissionGranted = useFileStore(state => state.setPermissionGranted);
    const initialize = useFileStore(state => state.initialize);
    const fetchApps = useFileStore(state => state.fetchApps);
    const fetchPhotos = useFileStore(state => state.fetchPhotos);
    const fetchVideos = useFileStore(state => state.fetchVideos);
    const fetchMusic = useFileStore(state => state.fetchMusic);
    const selectedItems = useFileStore(state => state.selectedItems);
    const toggleSelection = useFileStore(state => state.toggleSelection);
    const clearSelection = useFileStore(state => state.clearSelection);

    // State
    // const [activeTab, setActiveTab] = useState('Apps'); // Managed by Native Tabs
    const [searchQuery, setSearchQuery] = useState('');

    // Game Resource Modal State
    const [gameModalVisible, setGameModalVisible] = useState(false);
    const [activeGame, setActiveGame] = useState<any>(null);

    // Folder Navigation State
    const [isBrowsingFolders, setIsBrowsingFolders] = useState(false);
    const [currentPath, setCurrentPath] = useState('/storage/emulated/0');
    const [history, setHistory] = useState<string[]>([]);

    // Local directory items (for Folder Browsing only, not managed by global store)
    const [directoryItems, setDirectoryItems] = useState<any[]>([]);
    const [directoryLoading, setDirectoryLoading] = useState(false);

    // Category Filter State
    const [filterMode, setFilterMode] = useState<string | null>(null);

    // Filtered items (for specific category filters like docs, archives, search results in dashboard)
    const [filteredFileItems, setFilteredFileItems] = useState<any[]>([]);
    const [isFiltering, setIsFiltering] = useState(false);

    const [volumes, setVolumes] = useState<any[]>([]);
    const [showHidden, setShowHidden] = useState(false);


    // ⏱️ PERFORMANCE: Track component mount time
    useEffect(() => {
        const mountTime = Date.now();
        console.log(`[FILEBROWSER] 📂 Component mounted at ${new Date().toISOString()}`);

        return () => {
            console.log(`[FILEBROWSER] 📂 Component unmounted after ${Date.now() - mountTime}ms`);
        };
    }, []);

    useEffect(() => {
        loadVolumes();

        // 🏠 AUTO-REFRESH: When user returns from settings/SAF
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && isBrowsingFolders) {
                console.log('[FILEBROWSER] 🔄 App returned to focus, refreshing directory...');
                loadDirectory(currentPath);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isBrowsingFolders, currentPath]);

    const loadVolumes = async () => {
        const vols = await FileSystem.getStorageVolumes();
        setVolumes(vols);
    };

    // 🚀 Deep Linking / Direct Path Support
    useEffect(() => {
        const { initialPath, initialFilter, initialTab } = route.params || {};

        if (initialPath) {
            setCurrentPath(initialPath);
            setIsBrowsingFolders(true);
            setFilterMode(null);
        } else if (initialFilter) {
            setFilterMode(initialFilter);
            setIsBrowsingFolders(false);
        } else if (initialTab) {
            // Reset state to show tabs if a specific tab is targeted
            setIsBrowsingFolders(false);
            setFilterMode(null);
        }
    }, [route.params?.initialPath, route.params?.initialFilter, route.params?.initialTab]);

    // 🎯 Update active tab key when params change and navigate programmatically
    useEffect(() => {
        const { initialTab, t: timestamp } = route.params || {};
        console.log('[FileBrowser] 📍 Params changed:', { initialTab, timestamp, currentActiveTab: activeTabKey, currentTimestamp: tabTimestamp });

        // Always update when we have a new timestamp (new navigation from Home)
        if (initialTab && timestamp && timestamp !== tabTimestamp) {
            console.log('[FileBrowser] 🔄 Switching to tab:', initialTab);
            setActiveTabKey(initialTab);
            setTabTimestamp(timestamp);

            // Programmatically navigate to the tab using the ref
            // Use setTimeout to ensure Tab.Navigator is ready
            setTimeout(() => {
                if (tabNavigationRef.current) {
                    console.log('[FileBrowser] 🚀 Programmatic navigation to:', initialTab);
                    tabNavigationRef.current.navigate(initialTab);
                }
            }, 100);
        }
    }, [route.params?.initialTab, route.params?.t]);

    // Derived Data helper
    // We strictly use store data for the main tabs, and local state for folders/filters
    const getCurrentData = () => {
        if (filterMode) {
            return { data: filteredFileItems, status: isFiltering ? 'loading' : 'success' };
        }
        if (isBrowsingFolders) {
            return { data: directoryItems, status: directoryLoading ? 'loading' : 'success' };
        }
        return { data: [], status: 'success' as const };
    };

    const currentTabState = getCurrentData();

    // Effect for Folder Browsing
    useEffect(() => {
        if (isBrowsingFolders) {
            loadDirectory(currentPath);
        }
    }, [isBrowsingFolders, currentPath, showHidden]);


    const loadDirectory = async (path: string) => {
        setDirectoryLoading(true);
        try {
            // Handle SAF Content URIs
            if (path.startsWith('content://')) {
                const safFiles = await SAFService.listFiles(path);
                const items = safFiles.map(f => ({
                    name: f.name,
                    filename: f.name,
                    path: f.uri, // Use URI as path for navigation
                    isDirectory: f.isDirectory,
                    size: f.size,
                    dateModified: f.lastModified / 1000,
                    isDirectorySaf: f.isDirectory // marker
                })).sort((a, b) => {
                    if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                    return a.isDirectory ? -1 : 1;
                });
                setDirectoryItems(items);
                setDirectoryLoading(false);
                return;
            }

            // Professional Standard: Always attempt raw Native Listing
            const data = await FileSystem.getDirectoryListing(path, showHidden);

            // Special handling for Restricted Directories on Android 11+
            if (Platform.OS === 'android' && Platform.Version >= 30) {
                const isRootData = path.endsWith('/Android/data');
                const isRootObb = path.endsWith('/Android/obb');
                const isSubData = path.includes('/Android/data/');
                const isSubObb = path.includes('/Android/obb/');

                // If OBB or Data is empty, check for missing permissions FIRST (Per User Request)
                if ((isRootData || isRootObb) && data.length === 0) {
                    // 1. Check All Files Access
                    const isAllFilesGranted = await FileSystem.hasAllFilesPermission();
                    if (!isAllFilesGranted) {
                        setDirectoryItems([{
                            name: isRootData ? 'data' : 'obb',
                            path: path,
                            isSpecial: 'perm_all_files',
                            type: isRootData ? 'data' : 'obb',
                            isDirectory: true,
                            size: 0,
                        } as any]);
                        setDirectoryLoading(false);
                        return;
                    }

                    // 2. Check Install Packages (Requested by User - OBB ONLY)
                    if (isRootObb) {
                        const isInstallGranted = await FileSystem.canInstallPackages();
                        if (!isInstallGranted) {
                            setDirectoryItems([{
                                name: 'obb',
                                path: path,
                                isSpecial: 'perm_install',
                                type: 'obb',
                                isDirectory: true,
                                size: 0,
                            } as any]);
                            setDirectoryLoading(false);
                            return;
                        }
                    }

                    // 3. SMART GUESSING: Generate virtual folders from installed apps
                    const sourceApps = apps.data || [];
                    const virtualItems = sourceApps
                        .filter(app => (isRootData ? true : (app.hasObb || app.packageName.includes('.'))))
                        .map(app => ({
                            name: app.packageName,
                            path: `${path}/${app.packageName}`,
                            isDirectory: true,
                            isPackage: true,
                            packageName: app.packageName,
                            size: 0,
                            dateModified: Date.now() / 1000,
                        }));

                    if (virtualItems.length > 0) {
                        setDirectoryItems(virtualItems.sort((a, b) => a.name.localeCompare(b.name)));
                    } else {
                        // Fallback to SAF Root Grant if no apps found
                        setDirectoryItems([{
                            name: isRootData ? 'data' : 'obb',
                            path: path,
                            isSpecial: 'saf_root_grant',
                            type: isRootData ? 'data' : 'obb',
                            isDirectory: true,
                            size: 0,
                            dateModified: Date.now() / 1000
                        } as any]);
                    }
                    setDirectoryLoading(false);
                    return;
                }

                // 2. SUBFOLDER LEVEL (Specific package folder is empty)
                if ((isSubData || isSubObb) && data.length === 0) {
                    const pathParts = path.split('/');
                    const lastPart = pathParts[pathParts.length - 1];
                    const type = isSubData ? 'data' : 'obb';
                    const packageName = lastPart;

                    const storedUri = await SAFService.getStoredUri(packageName, type);

                    if (!storedUri) {
                        // AUTO-PROMPT (Direct Flow): Trigger Alert immediately since native failed
                        handleSafUnlock(type, undefined, packageName, path);

                        setDirectoryItems([{
                            name: packageName,
                            path: path,
                            isSpecial: 'saf_grant',
                            packageName: packageName,
                            type: type,
                            isDirectory: true,
                            size: 0,
                            dateModified: Date.now() / 1000
                        } as any]);
                        setDirectoryLoading(false);
                        return;
                    }
                }
            }


            setDirectoryItems(data);
        } catch (e) {
            console.error(e);
            setDirectoryItems([]);
        } finally {
            setDirectoryLoading(false);
        }
    };

    // Effect for Filter Mode
    useEffect(() => {
        if (filterMode) {
            loadFilteredFiles();
        }
    }, [filterMode]);

    const loadFilteredFiles = async () => {
        setIsFiltering(true);
        try {
            const allFiles = await FileSystem.getAllFiles(); // Still heavy, but limited to filters
            let data: any[] = [];
            switch (filterMode) {
                case 'docs':
                    data = allFiles.filter(f => ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt'].includes(f.filename.split('.').pop()?.toLowerCase() || ''));
                    break;
                case 'ebooks':
                    data = allFiles.filter(f => ['epub', 'mobi', 'pdf'].includes(f.filename.split('.').pop()?.toLowerCase() || ''));
                    break;
                case 'archives':
                    data = allFiles.filter(f => ['zip', 'rar', '7z', 'tar', 'gz'].includes(f.filename.split('.').pop()?.toLowerCase() || ''));
                    break;
                case 'bigfiles':
                    data = allFiles.filter(f => f.size > 100 * 1024 * 1024);
                    break;
                case 'apks':
                    data = allFiles.filter(f => f.filename.toLowerCase().endsWith('.apk'));
                    break;
            }
            setFilteredFileItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsFiltering(false);
        }
    };

    // Derived Data helper
    const { data: rawItems, status } = getCurrentData(); // Only for Folder/Filter modes now

    // Helper to filter data based on search query (Generic)
    const getFilteredData = useCallback((data: any[]) => {
        if (!data) return [];
        if (searchQuery.length === 0) return data;
        const lowerQuery = searchQuery.toLowerCase();
        return data.filter((i: any) =>
            (i.name || i.filename || '').toLowerCase().includes(lowerQuery)
        );
    }, [searchQuery]);

    // Used for Folder/Filter modes
    const itemsToRender = useMemo(() => {
        return getFilteredData(rawItems);
    }, [rawItems, getFilteredData]);

    // Navigation Methods
    const navigateTo = async (path: string) => {
        // --- 🛡️ Professional Direct SAF Intercept (Android 11+) ---
        if (Platform.OS === 'android' && Platform.Version >= 30) {
            const isSubData = path.includes('/Android/data/');
            const isSubObb = path.includes('/Android/obb/');

            if (isSubData || isSubObb) {
                const parts = path.split('/');
                const packageName = parts[parts.length - 1]; // e.g. com.tencent.ig
                const type = isSubData ? 'data' : 'obb';

                // Check for pre-authorized URI
                const storedUri = await SAFService.getStoredUri(packageName, type);

                if (storedUri) {
                    // Transparently redirect to authorize SAF Content URI
                    path = storedUri;
                }
            }
        }

        setHistory([...history, currentPath]);
        setCurrentPath(path);
        setDirectoryItems([]);
        clearSelection(); // Clear selection directly
    };

    const navigateUp = () => {
        if (history.length === 0) return;
        const previousPath = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        setHistory(newHistory);
        setCurrentPath(previousPath);
        setDirectoryItems([]);
        clearSelection(); // Clear selection directly
    };

    // REMOVED: useEffect for clearing selection on tab change (caused double render)
    // Instead we do it in the handlers

    // EFFECT: Back Handler
    useEffect(() => {
        const backAction = () => {
            if (filterMode) {
                setFilterMode(null);
                setFilteredFileItems([]);
                clearSelection();
                return true;
            }
            if (isBrowsingFolders) {
                if (history.length > 0) {
                    navigateUp();
                } else {
                    setIsBrowsingFolders(false);
                    clearSelection();
                }
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [isBrowsingFolders, history, filterMode, clearSelection]);


    const handleResourceConfirm = (files: any[]) => {
        setGameModalVisible(false);
        setActiveGame(null);

        files.forEach(file => {
            const isDuplicate = selectedItems.some(existing => (existing.path || existing.id) === (file.path || file.id));
            if (!isDuplicate) {
                toggleSelection(file);
            }
        });
    };

    // Performance: useMemo for selected check
    const isItemSelected = useCallback((item: any) => {
        const id = item.packageName || item.path || item.id;
        return selectedItems.some(i => (i.packageName || i.path || i.id) === id);
    }, [selectedItems]);

    // --- App Selection Logic ---
    const handleAppPress = (item: any) => {
        // If it's a game (has OBB or is marked as game), show resource modal
        // But only if we are SELECTING (adding), not deselecting? 
        // Actually, usually we show modal on first selection.
        const selected = isItemSelected(item);

        if (!selected && item.isGame) {
            setActiveGame(item);
            setGameModalVisible(true);
        } else {
            toggleSelection(item);
        }
    };

    // --- Render Items (MEMOIZED with useCallback) ---
    const renderAppItem = useCallback(({ item }: { item: any }) => {
        const selected = isItemSelected(item);
        return (
            <TouchableOpacity onPress={() => handleAppPress(item)} style={[styles.appGridItem, selected && { transform: [{ scale: 0.96 }] }]}>
                <View style={[styles.appIconContainer, selected && styles.selectedBorder]}>
                    {item.icon ? (
                        <Image
                            source={{ uri: item.icon }}
                            style={[styles.appIcon, selected && { opacity: 0.7 }]}
                            resizeMethod="resize"
                            fadeDuration={0}
                        />
                    ) : (
                        <Icon name="android" size={30} color={COLORS.primary} />
                    )}
                    {selected && <View style={styles.checkBadge}><Icon name="check" size={10} color="#FFF" /></View>}
                </View>
                <Text style={[styles.gridLabel, selected && { color: COLORS.secondary, fontWeight: 'bold' }]} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.gridSubLabel}>{formatSize(item.size || item.appSize || 0)}</Text>
            </TouchableOpacity>
        );
    }, [selectedItems, toggleSelection, isItemSelected]);

    const renderPhotoItem = useCallback(({ item }: { item: any }) => {
        const selected = isItemSelected(item);
        const imageUri = item.uri || `file://${item.path}`;

        return (
            <TouchableOpacity onPress={() => toggleSelection(item)} style={[styles.photoGridItem, selected && { transform: [{ scale: 0.96 }] }]}>
                <View style={[styles.photoContainer, selected && styles.selectedOverlay]}>
                    <Image
                        source={{ uri: imageUri }}
                        style={[styles.photoImage, selected && { opacity: 0.7 }]}
                        resizeMode="cover"
                        resizeMethod="resize"
                        fadeDuration={0}
                    />
                    {selected && (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 212, 255, 0.2)' }]} />
                    )}
                </View>
                {selected && <View style={styles.checkBadge}><Icon name="check" size={12} color="#FFF" /></View>}
            </TouchableOpacity>
        );
    }, [selectedItems, toggleSelection, isItemSelected]);

    // --- Photo Grouping by Date (OPTIMIZED) ---
    // Pre-compute rows of 3 to avoid O(n²) find/indexOf in renderItem
    const groupPhotosByDate = useMemo(() => {
        // Prevent calculation during permission transition
        if (permissionLoading) return [];
        const sourceData = photos.data || [];
        // Slice data for progressive rendering
        const photosList = sourceData.slice(0, renderLimit);

        if (photosList.length === 0) return [];

        // Group by date string
        const groups: { [key: string]: any[] } = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        photosList.forEach((photo: any) => {
            const timestamp = (photo.dateModified || photo.dateAdded || 0) * 1000;
            const date = new Date(timestamp);
            date.setHours(0, 0, 0, 0);

            let dateKey: string;
            if (date.getTime() === today.getTime()) {
                dateKey = t('common.today', { defaultValue: 'Today' });
            } else if (date.getTime() === yesterday.getTime()) {
                dateKey = t('common.yesterday', { defaultValue: 'Yesterday' });
            } else {
                dateKey = new Date(timestamp).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(photo);
        });

        // Convert to SectionList format with PRE-COMPUTED ROWS (groups of 3)
        const todayLabel = t('common.today', { defaultValue: 'Today' });
        const yesterdayLabel = t('common.yesterday', { defaultValue: 'Yesterday' });

        const sections = Object.keys(groups).map(title => {
            const allPhotos = groups[title];
            // Pre-compute rows of 3 photos each
            const rows: any[][] = [];
            for (let i = 0; i < allPhotos.length; i += 3) {
                rows.push(allPhotos.slice(i, i + 3));
            }
            return {
                title,
                data: rows, // Now data is ROWS, not individual photos
                count: allPhotos.length,
                timestamp: (allPhotos[0].dateModified || allPhotos[0].dateAdded || 0) * 1000
            };
        });

        // Sort sections
        sections.sort((a, b) => {
            if (a.title === todayLabel) return -1;
            if (b.title === todayLabel) return 1;
            if (a.title === yesterdayLabel) return -1;
            if (b.title === yesterdayLabel) return 1;
            return b.timestamp - a.timestamp;
        });

        return sections;
    }, [photos.data, t]);

    const renderPhotoSectionHeader = ({ section }: { section: { title: string; count: number } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.count} {t('common.photos', { defaultValue: 'Photos' }).toLowerCase()}</Text>
        </View>
    );

    const renderVideoItem = useCallback(({ item }: { item: any }) => {
        const selected = isItemSelected(item);

        return (
            <TouchableOpacity onPress={() => toggleSelection(item)}>
                <GlassCard style={[styles.videoRow, selected && styles.selectedCard]} variant={selected ? 'light' : 'medium'}>
                    <View style={styles.videoThumb}>
                        <DynamicThumbnail
                            path={item.uri || `file://${item.path}`}
                            fallbackIcon="play-circle-filled"
                            fallbackColor={COLORS.white}
                            style={{ width: '100%', height: '100%', borderRadius: 8, opacity: selected ? 0.5 : 0.8 }}
                        />
                        {selected && (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 212, 255, 0.2)', borderRadius: 8 }]} />
                        )}
                        <View style={{ position: 'absolute' }}>
                            <Icon name="play-circle-filled" size={24} color={COLORS.white} />
                        </View>
                    </View>
                    <View style={styles.listInfo}>
                        <Text style={[styles.itemTitle, selected && { color: COLORS.secondary }]} numberOfLines={1}>{item.name || item.filename}</Text>
                        <Text style={styles.itemSub}>{formatSize(item.size)} • {item.duration ? new Date(item.duration).toISOString().substr(14, 5) : ''}</Text>
                    </View>
                    {selected ? <Icon name="check-circle" size={24} color={COLORS.secondary} /> : <Icon name="radio-button-unchecked" size={24} color={COLORS.glassBorder} />}
                </GlassCard>
            </TouchableOpacity>
        );
    }, [selectedItems, toggleSelection, isItemSelected]);

    const renderMusicItem = useCallback(({ item }: { item: any }) => {
        const selected = isItemSelected(item);

        return (
            <TouchableOpacity onPress={() => toggleSelection(item)}>
                <GlassCard style={[styles.videoRow, selected && styles.selectedCard]} variant={selected ? 'light' : 'medium'}>
                    <View style={[styles.videoThumb, { width: 50, height: 50, borderRadius: 8, backgroundColor: selected ? 'rgba(0, 212, 255, 0.2)' : 'rgba(233, 30, 99, 0.1)', overflow: 'hidden' }]}>
                        <Icon name="music-note" size={24} color="#E91E63" />
                        <DynamicThumbnail
                            path={item.uri || `file://${item.path}`}
                            fallbackIcon="music-note"
                            fallbackColor="#E91E63"
                            style={{ width: '100%', height: '100%', position: 'absolute' }}
                        />
                    </View>
                    <View style={styles.listInfo}>
                        <Text style={[styles.itemTitle, selected && { color: COLORS.secondary }]} numberOfLines={1}>{item.name || item.filename}</Text>
                        <Text style={styles.itemSub}>{formatSize(item.size)} • {item.artist || t('common.unknown_artist')}</Text>
                    </View>
                    {selected ? <Icon name="check-circle" size={24} color={COLORS.secondary} /> : <Icon name="radio-button-unchecked" size={24} color={COLORS.glassBorder} />}
                </GlassCard>
            </TouchableOpacity>
        );
    }, [selectedItems, toggleSelection, isItemSelected, t]);



    // --- SAF Unlock Handler ---
    const handleSafUnlock = async (type: 'data' | 'obb', uri?: string, packageName?: string, fullPath?: string) => {
        if (uri) {
            // Already have URI, just navigate
            navigateTo(uri);
            return;
        }

        const isRoot = !packageName;
        // Clean path to start from Android/ as requested
        const cleanPath = fullPath ? fullPath.replace(/^\/storage\/emulated\/0\//, '') : (packageName || '');

        Alert.alert(
            t('permissions.saf_direct_title', { defaultValue: 'Folder Access Required' }),
            isRoot
                ? t('permissions.root_access_msg', { defaultValue: 'To show all files and folders in Android/obb, please select "Use this folder" in the next screen.' })
                : t('permissions.saf_direct_msg', {
                    defaultValue: `To access files in this folder ${cleanPath} please select "Use this folder" in the next screen.`,
                    path: cleanPath
                }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.ok'),
                    onPress: async () => {
                        // Use packageName if available (Virtual Folder), otherwise fallback to empty for root
                        const pkg = packageName || '';
                        const result = await SAFService.requestGameFolderAccess(pkg, type);
                        if (result?.uri) {
                            // Success! Navigate to the new SAF URI
                            navigateTo(result.uri);
                        } else {
                            // SAF result is null -> Show workaround instructions
                            Alert.alert(
                                t('permissions.required_title'),
                                t('permissions.saf_workaround_instructions'),
                                [
                                    { text: t('common.cancel'), style: 'cancel' },
                                    {
                                        text: t('common.open_settings'),
                                        onPress: () => SAFService.openSystemAppSettings("com.google.android.documentsui")
                                    }
                                ]
                            );
                        }
                    }
                }
            ]
        );
    };

    // --- Permission Unlock Handler (Per User Request) ---
    const handlePermissionUnlock = async (isAllFiles: boolean) => {
        if (isAllFiles) {
            await FileSystem.requestAllFilesPermission();
        } else {
            await FileSystem.requestInstallPackages();
        }
        // AppState listener handles the refresh when user returns
    };

    const renderDirItem = useCallback(({ item }: { item: any }) => {
        const selected = selectedItems.some(i => i.path === item.path);

        // Handle Special Unlock Items
        if (item.isSpecial) {
            const isRootUnlock = item.isSpecial === 'saf_root_grant';
            const isPermissionItem = item.isSpecial === 'perm_all_files' || item.isSpecial === 'perm_install';

            if (isPermissionItem) {
                const isAllFiles = item.isSpecial === 'perm_all_files';
                return (
                    <TouchableOpacity onPress={() => handlePermissionUnlock(isAllFiles)}>
                        <GlassCard style={[styles.fileRow, { backgroundColor: 'rgba(255, 87, 34, 0.1)', borderColor: '#FF5722' }]} variant="light">
                            <View style={[styles.fileIcon, { backgroundColor: 'rgba(255, 87, 34, 0.2)' }]}>
                                <Icon name={isAllFiles ? "folder-shared" : "install-mobile"} size={24} color="#FF5722" />
                            </View>
                            <View style={styles.listInfo}>
                                <Text style={[styles.itemTitle, { color: '#FF5722', fontWeight: 'bold' }]}>
                                    {isAllFiles ? t('permissions.allow_all_files', { defaultValue: 'Allow All Files Access' }) : t('permissions.allow_install', { defaultValue: 'Allow Install Unknown Apps' })}
                                </Text>
                                <Text style={styles.itemSub}>
                                    {isAllFiles
                                        ? t('permissions.all_files_desc', { defaultValue: 'Required to see system folders like OBB and DATA.' })
                                        : t('permissions.install_desc', { defaultValue: 'Required for complete access to game files and installations.' })}
                                </Text>
                            </View>
                            <NeoButton
                                label={t('common.grant', { defaultValue: 'GRANT' })}
                                onPress={() => handlePermissionUnlock(isAllFiles)}
                                icon={<Icon name="arrow-forward" size={16} color={COLORS.white} />}
                                style={{ height: 40, width: 100 }}
                                textStyle={{ fontSize: 12 }}
                            />
                        </GlassCard>
                    </TouchableOpacity>
                );
            }

            return (
                <TouchableOpacity onPress={() => handleSafUnlock(item.type, item.uri, item.packageName)}>
                    <GlassCard style={[styles.fileRow, { backgroundColor: isRootUnlock ? 'rgba(255, 193, 7, 0.1)' : 'rgba(33, 150, 243, 0.1)', borderColor: isRootUnlock ? '#FFC107' : COLORS.primary }]} variant="light">
                        <View style={[styles.fileIcon, { backgroundColor: isRootUnlock ? 'rgba(255, 193, 7, 0.2)' : 'rgba(33, 150, 243, 0.2)' }]}>
                            {item.icon ? (
                                <Image source={{ uri: item.icon }} style={{ width: 24, height: 24, borderRadius: 5 }} />
                            ) : (
                                <Icon name={isRootUnlock ? "security" : (item.isSpecial === 'saf_redirect' ? "lock-open" : "lock")} size={24} color={isRootUnlock ? '#FFC107' : COLORS.primary} />
                            )}
                        </View>
                        <View style={styles.listInfo}>
                            <Text style={[styles.itemTitle, { color: isRootUnlock ? '#FFC107' : COLORS.primary, fontWeight: 'bold' }]}>
                                {isRootUnlock ? t('permissions.unlock_system_folder', { folder: item.name, defaultValue: `Unlock ${item.name} Folder` }) : item.name}
                            </Text>
                            <Text style={styles.itemSub}>
                                {isRootUnlock
                                    ? t('permissions.root_access_desc', { defaultValue: 'Full access required to show all files' })
                                    : (item.isSpecial === 'saf_redirect'
                                        ? t('common.open', { defaultValue: 'Open' })
                                        : t('permissions.tap_to_unlock', { defaultValue: 'Tap to Allow Access' }))}
                            </Text>
                        </View>
                        <Icon name="arrow-forward" size={24} color={isRootUnlock ? '#FFC107' : COLORS.primary} />
                    </GlassCard>
                </TouchableOpacity>
            );
        }


        const isDir = item.isDirectory;
        const iconConfig = getFileIcon(item.name, isDir);

        // HIGH-END: Package Folder Logic (for Android/data & Android/obb)
        if (isDir && item.isPackage) {
            return (
                <PackageFolder
                    item={item}
                    selected={selected}
                    onNavigate={navigateTo}
                    onLongPress={toggleSelection}
                    t={t}
                />
            );
        }

        return (
            <TouchableOpacity
                onPress={() => isDir ? navigateTo(item.path) : toggleSelection(item)}
                onLongPress={() => toggleSelection(item)}
            >
                <View style={[styles.fileRow, selected && styles.selectedFileRow]}>
                    <DynamicFileIcon
                        filename={item.name}
                        path={item.path}
                        isDir={isDir}
                        iconConfig={iconConfig}
                    />
                    <View style={styles.listInfo}>
                        <Text style={[styles.itemTitle, selected && { color: COLORS.secondary }]} numberOfLines={1}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {!isDir && <Text style={styles.itemSub}>{formatSize(item.size)} • </Text>}
                            <Text style={styles.itemSub}>{new Date(item.dateModified * 1000).toLocaleDateString()}</Text>
                        </View>
                    </View>
                    {selected ? <Icon name="check-circle" size={20} color={COLORS.secondary} /> : isDir && <Icon name="chevron-right" size={20} color={COLORS.textDim} />}
                </View>
                <View style={styles.divider} />
            </TouchableOpacity>
        );
    }, [selectedItems, toggleSelection, navigateTo, t]);

    // --- Dashboard Renderer ---
    const renderDashboard = () => (
        <ScrollView contentContainerStyle={{ padding: SIZES.padding }}>
            {/* Category Grid */}
            <View style={styles.dashboardGrid}>

                <DashboardItem
                    icon="android"
                    label="APKs"
                    count={dashboardCounts.apks}
                    subLabel="apk"
                    onPress={() => setFilterMode('apks')}
                />
                <DashboardItem
                    icon="description"
                    label={t('file_types.docs', { defaultValue: 'Docs' })}
                    count={dashboardCounts.docs}
                    subLabel="doc, pdf..."
                    onPress={() => setFilterMode('docs')}
                />
                <DashboardItem
                    icon="book"
                    label={t('file_types.ebooks', { defaultValue: 'E-Books' })}
                    count={dashboardCounts.ebooks || 0}
                    subLabel="epub, pdf"
                    onPress={() => setFilterMode('ebooks')}
                />
                <DashboardItem
                    icon="archive"
                    label={t('file_types.archives', { defaultValue: 'Archives' })}
                    count={dashboardCounts.archives}
                    subLabel="zip, rar"
                    onPress={() => setFilterMode('archives')}
                />
                <DashboardItem
                    icon="storage"
                    label={t('file_types.big_files', { defaultValue: 'Big Files' })}
                    count={dashboardCounts.bigfiles}
                    subLabel=">100MB"
                    onPress={() => setFilterMode('bigfiles')}
                />
                <DashboardItem
                    icon="contacts"
                    label={t('file_types.contacts', { defaultValue: 'Contacts' })}
                    count={0}
                    subLabel="vcf"
                    onPress={() => setFilterMode('contacts')}
                />
            </View>

            <View style={{ height: 20 }} />

            <Text style={{ ...FONTS.h4, color: COLORS.white, marginBottom: 10, marginLeft: 4 }}>
                {t('common.storage_devices', { defaultValue: 'Storage Devices' })}
            </Text>

            {/* Storage Volumes List */}
            {volumes.length > 0 ? (
                volumes.map((vol, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => {
                            setCurrentPath(vol.path);
                            // Clear history so we start fresh from this root
                            setHistory([]);
                            setIsBrowsingFolders(true);
                        }}
                    >
                        <GlassCard style={[styles.storageRowCard, { marginBottom: 10 }]} variant={vol.isInternal ? 'medium' : 'light'}>
                            <View style={styles.storageIconBg}>
                                <Icon name={vol.isRemovable ? "usb" : "smartphone"} size={24} color={COLORS.white} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.storageTitle}>
                                    {vol.isInternal ? t('common.internal_storage') : `${t('common.external_storage')} ${index}`}
                                </Text>
                                <Text style={styles.storageSubtitle}>{vol.path}</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color={COLORS.textDim} />
                        </GlassCard>
                    </TouchableOpacity>
                ))
            ) : (
                // Fallback if volumes not loaded yet or empty (should ideally default to 1)
                <TouchableOpacity onPress={() => setIsBrowsingFolders(true)}>
                    <GlassCard style={styles.storageRowCard}>
                        <View style={styles.storageIconBg}>
                            <Icon name="smartphone" size={24} color={COLORS.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.storageTitle}>{t('common.internal_storage')}</Text>
                            <Text style={styles.storageSubtitle}>/storage/emulated/0</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color={COLORS.textDim} />
                    </GlassCard>
                </TouchableOpacity>
            )}

        </ScrollView>
    );

    const DashboardItem = ({ icon, label, count, subLabel, onPress, iconColor, bgColor }: any) => (
        <TouchableOpacity style={styles.dashItem} onPress={onPress}>
            <View style={[styles.dashIconCircle, bgColor && { backgroundColor: bgColor }]}>
                <Icon name={icon} size={28} color={iconColor || COLORS.white} />
            </View>
            <Text style={styles.dashCount}>({count}) {label}</Text>
            <Text style={styles.dashSub}>{subLabel}</Text>
        </TouchableOpacity>
    );

    const [permissionLoading, setPermissionLoading] = useState(false);
    // Progressive Loading State
    const [renderLimit, setRenderLimit] = useState(100);

    // Increase render limit after initial mount
    useEffect(() => {
        if (!isPermissionGranted) return;

        // Stage 1: Fast load
        const t1 = setTimeout(() => {
            setRenderLimit(500);
        }, 500);

        // Stage 2: Full load
        const t2 = setTimeout(() => {
            setRenderLimit(20000); // Load rest
        }, 1000);

        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isPermissionGranted]);

    // --- Permission Handling ---
    const handlePermissionRetry = async () => {
        setPermissionLoading(true);
        try {
            const status = await PermissionsManager.requestMediaPermissionsOnly();
            if (status === 'granted') {
                setPermissionGranted(true);
                // Defer heavy fetching to ensure UI animation starts smoothly
                setTimeout(() => {
                    initialize();
                }, 500);
            }
        } finally {
            // Delay hide to prevent crash and show feedback
            setTimeout(() => {
                setPermissionLoading(false);
            }, 1000);
        }
    };

    const renderPermissionRequest = () => (
        <View style={styles.centerContainer}>
            <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: 'rgba(255, 46, 85, 0.1)',
                alignItems: 'center', justifyContent: 'center', marginBottom: 20
            }}>
                <Icon name="lock-outline" size={40} color={COLORS.error} />
            </View>
            <Text style={{ ...FONTS.h3, color: COLORS.white, marginBottom: 10 }}>
                {t('permissions.required_title', { defaultValue: 'Access Required' })}
            </Text>
            <Text style={{ ...FONTS.body2, color: COLORS.textDim, textAlign: 'center', maxWidth: '70%', marginBottom: 30 }}>
                {t('permissions.required_desc', { defaultValue: 'To view your photos, videos, and music, MisterShare needs access to your device storage.' })}
            </Text>

            {permissionLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 10 }} />
                    <Text style={{ ...FONTS.body3, color: COLORS.textDim }}>{t('common.processing', { defaultValue: 'Processing...' })}</Text>
                </View>
            ) : (
                <NeoButton
                    label={t('permissions.grant', { defaultValue: 'Allow Access' })}
                    onPress={handlePermissionRetry}
                    width={200}
                    variant="primary"
                />
            )}
        </View>
    );

    // --- Tab Screens (Using separate memoized components) ---
    const AppsScreen = useCallback(() => (
        <AppsTab
            renderAppItem={renderAppItem}
            getFilteredData={getFilteredData}
            styles={styles}
        />
    ), [renderAppItem, getFilteredData]);

    const PhotosScreen = useCallback(() => (
        <PhotosTab
            renderPhotoItem={renderPhotoItem}
            renderPermissionRequest={renderPermissionRequest}
            renderPhotoSectionHeader={renderPhotoSectionHeader}
            getFilteredData={getFilteredData}
            searchQuery={searchQuery}
            permissionLoading={permissionLoading}
            styles={styles}
        />
    ), [renderPhotoItem, renderPermissionRequest, renderPhotoSectionHeader, getFilteredData, searchQuery, permissionLoading]);

    const VideosScreen = useCallback(() => (
        <VideosTab
            renderVideoItem={renderVideoItem}
            renderPermissionRequest={renderPermissionRequest}
            getFilteredData={getFilteredData}
            permissionLoading={permissionLoading}
            styles={styles}
        />
    ), [renderVideoItem, renderPermissionRequest, getFilteredData, permissionLoading]);

    const MusicScreen = useCallback(() => (
        <MusicTab
            renderMusicItem={renderMusicItem}
            renderPermissionRequest={renderPermissionRequest}
            getFilteredData={getFilteredData}
            permissionLoading={permissionLoading}
            styles={styles}
        />
    ), [renderMusicItem, renderPermissionRequest, getFilteredData, permissionLoading]);

    const DashboardScreen = useCallback(() => renderDashboard(), [renderDashboard]);

    // --- Main Render ---
    return (
        <AppBackground>
            {/* Header Area */}
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Icon name="search" size={20} color={COLORS.textDim} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('common.search')}
                        placeholderTextColor={COLORS.textDim}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
                            <Icon name="close" size={20} color={COLORS.textDim} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setShowHidden(!showHidden)}>
                        <Icon name={showHidden ? "visibility" : "visibility-off"} size={22} color={showHidden ? COLORS.secondary : COLORS.textDim} />
                    </TouchableOpacity>

                </View>
            </View>

            {/* Banner Ad Below Header/Search */}
            <View style={{ 
                alignItems: 'center', 
                marginBottom: isBannerLoaded ? 10 : 0, 
                height: isBannerLoaded ? 'auto' : 0,
                overflow: 'hidden' 
            }}>
                <BannerAd
                    unitId={'ca-app-pub-8298073076766088/2978008663'}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    onAdLoaded={() => setIsBannerLoaded(true)}
                    onAdFailedToLoad={() => setIsBannerLoaded(false)}
                />
            </View>

            {/* Content Area */}
            <View style={styles.contentContainer}>
                {/* 1. Global Permission Request - REMOVED, handled per tab */}
                {/* !isPermissionGranted && <View style={{padding: 20}}>{renderPermissionRequest()}</View> */}

                {/* 2. Folder / Filter Mode (Takes Precedence) */}
                {(isBrowsingFolders || filterMode) ? (
                    <FlatList
                        key="folder-list"
                        data={itemsToRender}
                        renderItem={renderDirItem}
                        keyExtractor={item => item.path}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={
                            <View style={styles.breadcrumbContainer}>
                                <TouchableOpacity onPress={filterMode ? () => setFilterMode(null) : navigateUp} style={{ padding: 4 }}>
                                    <Icon name="arrow-back" size={20} color={COLORS.white} />
                                </TouchableOpacity>
                                <Text style={styles.breadcrumbPath} numberOfLines={1}>
                                    {filterMode ? t(`file_types.${filterMode}`) : currentPath.replace('/storage/emulated/0', t('common.internal_storage'))}
                                </Text>
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={styles.centerContainer}>
                                <Icon name="folder-off" size={48} color={COLORS.glassBorder} />
                                <Text style={{ ...FONTS.body2, color: COLORS.textDim, marginTop: 10 }}>{t('common.empty')}</Text>
                            </View>
                        }
                        stickyHeaderIndices={[0]}
                    />
                ) : (
                    /* 3. Native Tabs */
                    <Tab.Navigator
                        key={`tabs-${activeTabKey}-${tabTimestamp}`}
                        tabBar={props => {
                            // Always update ref (key changes create new Tab.Navigator)
                            tabNavigationRef.current = props.navigation;
                            return <CustomTabBar {...props} t={t} />;
                        }}
                        initialRouteName={activeTabKey}
                        screenOptions={{
                            lazy: true,
                            swipeEnabled: true,
                            animationEnabled: true,
                        }}
                        style={{ backgroundColor: 'transparent' }}
                    >
                        <Tab.Screen name="Apps" children={AppsScreen} options={{ tabBarLabel: 'common.apps' }} />
                        <Tab.Screen name="Photos" children={PhotosScreen} options={{ tabBarLabel: 'common.photos' }} />
                        <Tab.Screen name="Videos" children={VideosScreen} options={{ tabBarLabel: 'common.videos' }} />
                        <Tab.Screen name="Music" children={MusicScreen} options={{ tabBarLabel: 'common.music' }} />
                        <Tab.Screen name="Dashboard" children={DashboardScreen} options={{ tabBarLabel: 'common.files' }} />
                    </Tab.Navigator>
                )}
            </View>

            {/* Premium Selection Bar */}
            {selectedItems.length > 0 && (
                <View style={[styles.fabContainer, { bottom: 0 }]}>
                    <View
                        key={String(isRTL)}
                        style={[
                            styles.fabBar,
                            { flexDirection: effectiveDirection as any }
                        ]}
                    >
                        {/* Selection Summary with Close Button */}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity 
                                onPress={() => clearSelection()}
                                style={{ 
                                    marginRight: 16,
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: 20,
                                    width: 36,
                                    height: 36,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Icon name="close" size={20} color={COLORS.white} />
                            </TouchableOpacity>

                            <View style={{
                                justifyContent: 'center',
                                alignItems: (I18nManager.isRTL === isRTL) ? 'flex-start' : 'flex-end', // Fix for System/App Lang mismatch
                            }}>
                                <Text style={{ ...FONTS.h3, color: COLORS.white, fontSize: 16 }}>
                                    {selectedItems.length} {t('common.selected', { defaultValue: 'selected' })}
                                </Text>
                                <Text style={{
                                    ...FONTS.body3,
                                    color: COLORS.secondary,
                                    fontSize: 14,
                                    textAlign: isRTL ? 'right' : 'left'
                                }}>
                                    {formatSize(selectedItems.reduce((acc, item) => acc + (item.size || 0), 0))}
                                </Text>
                            </View>
                        </View>

                        {/* Send Button (Right in LTR, Left in RTL) */}
                        <TouchableOpacity
                            onPress={() => {
                                // 2024 UX FIX: Use requestAnimationFrame to ensure button press animation renders FIRST
                                // preventing the "frozen button" feel.
                                requestAnimationFrame(() => {
                                    const { isConnected, isGroupOwner, peerIP, serverIP } = useConnectionStore.getState();

                                    // 2024 ARCHITECTURE FIX: Unified Data Handoff
                                    // ALWAYS stage files in the global store. Never pass heavy data via navigation params.
                                    // This ensures Transfer.tsx (which listens to store) picks them up reliably.
                                    useTransferStore.getState().setOutgoingFiles(selectedItems);

                                    // Clear selection immediately as they are now handoff'd to the transfer queue
                                    clearSelection();

                                    if (isConnected) {
                                        const targetIP = isGroupOwner && peerIP ? peerIP : serverIP;
                                        if (isGroupOwner && !peerIP) {
                                            showToast(t('errors.no_peer_connected', { defaultValue: 'No device connected' }), 'error');
                                            return;
                                        }
                                        // Navigate to Transfer with Intent only, no Data
                                        navigation.navigate('Transfer', { mode: 'send', serverIP: targetIP });
                                    } else {
                                        // Not connected? Go to Connect flow.
                                        // Transfer store keeps the files staged until connection is established.
                                        navigation.navigate('ConnectTab');
                                    }
                                });
                            }}
                        >
                            <LinearGradient
                                colors={['#7F53AC', '#647DEE']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{
                                    flexDirection: effectiveDirection as any, // APPLY EFFECTIVE DIRECTION TO BUTTON TOO
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                    paddingHorizontal: 24,
                                    borderRadius: 16, // Reduced radius for button too
                                    gap: 8, // Clean, standard spacing (removed extra spacer view)
                                }}
                            >
                                <Text style={{
                                    ...FONTS.h3,
                                    color: COLORS.white,
                                    fontSize: 16
                                }}>
                                    {t('common.send', { defaultValue: 'Send' })}
                                </Text>

                                <Icon
                                    name="send"
                                    size={20}
                                    color={COLORS.white}
                                    // Icon flip is still needed because the icon glyph itself is directional
                                    style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Modals */}
            <GameResourceModal
                visible={gameModalVisible}
                onClose={() => setGameModalVisible(false)}
                game={activeGame}
                onConfirm={handleResourceConfirm}
            />

        </AppBackground >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: SIZES.padding,
        paddingTop: 50, // StatusBar
        paddingBottom: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        ...FONTS.body2,
        color: COLORS.white,
    },
    tabsWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 4,
        marginBottom: 12, // Added space between tabs and content
    },
    tabsContainer: {
        flexDirection: 'row',
        width: '100%',
        zIndex: 10,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabItemActive: {
        // 
    },
    tabLabel: {
        ...FONTS.h4,
        fontSize: 13,
        color: COLORS.textDim,
        fontWeight: '500',
    },
    tabLabelActive: {
        color: COLORS.secondary,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 212, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
    },
    animatedIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        width: 100, // Will be overridden
        justifyContent: 'center',
        alignItems: 'center',
    },
    indicatorLine: {
        width: 24, // Exact width under the word
        height: 3,
        backgroundColor: COLORS.secondary,
        borderRadius: 2,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 3,
    },
    contentContainer: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    listContent: {
        paddingBottom: 100, // Space for FAB
        paddingHorizontal: SIZES.padding,
    },
    gridContent: {
        paddingBottom: 100,
        paddingHorizontal: SIZES.padding,
        // justifyContent: 'space-between'
    },

    // Section Header for Photo Grouping
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        // Background matches page gradient top so content scrolls "behind" it
        backgroundColor: '#1A1A2E', // Matches gradientDark[0]
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.white,
        fontWeight: 'bold',
    },
    sectionCount: {
        ...FONTS.body3,
        color: COLORS.textDim,
    },

    // Grid Items
    appGridItem: {
        width: (width - SIZES.padding * 2) / 4 - 8,
        alignItems: 'center',
        marginHorizontal: 4,
        marginBottom: 16,
    },
    appIconContainer: {
        width: 50,
        height: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },

    appIcon: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        resizeMode: 'contain', // Ensure icon fits within the square
    },
    gridLabel: {
        ...FONTS.body4,
        color: COLORS.white,
        fontSize: 11,
        textAlign: 'center',
        width: '100%',
    },
    gridSubLabel: {
        ...FONTS.body4,
        color: COLORS.textDim,
        fontSize: 10,
    },

    // Check Badge
    checkBadge: {
        position: 'absolute',
        top: 4, // Floating inside top-right
        right: 4,
        backgroundColor: COLORS.secondary,
        borderRadius: 50, // Circle
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 25,
        elevation: 6,
    },
    selectedBorder: {
        borderColor: COLORS.secondary,
        borderWidth: 3,
        borderRadius: 14, // Matches appIconContainer
        ...SHADOWS.glow,
        shadowColor: COLORS.secondary,
        shadowRadius: 10,
    },

    // Photo Grid
    photoGridItem: {
        width: (width - SIZES.padding * 2) / 3 - 6,
        height: (width - SIZES.padding * 2) / 3 - 6,
        margin: 3,
        marginBottom: 3,
        borderRadius: 8,
        overflow: 'hidden',
    },
    photoContainer: {
        width: '100%',
        height: '100%',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    selectedOverlay: {
        borderWidth: 3,
        borderColor: COLORS.secondary,
        opacity: 0.8,
    },

    // List Rows
    videoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginBottom: 8,
        height: 80,
    },
    videoThumb: {
        width: 100,
        height: 60,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        borderRadius: 8,
    },
    listInfo: {
        flex: 1,
    },
    itemTitle: {
        ...FONTS.h4,
        color: COLORS.white,
        marginBottom: 4,
    },
    itemSub: {
        ...FONTS.body4,
        color: COLORS.textDim,
        fontSize: 12,
    },
    selectedCard: {
        borderColor: COLORS.secondary,
        borderWidth: 1,
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
    },

    // File Row
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    selectedFileRow: {
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 8,
        marginHorizontal: -8, // compensated
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 52,
    },

    // Dashboard
    dashboardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    dashItem: {
        width: '31%', // 3 columns
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dashIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    dashCount: {
        ...FONTS.h4,
        color: COLORS.white,
        fontSize: 14,
        marginBottom: 2,
    },
    dashSub: {
        ...FONTS.body4,
        color: COLORS.textDim,
        fontSize: 11,
    },

    // Storage
    storageRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    storageIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    storageTitle: {
        ...FONTS.h4,
        color: COLORS.white,
        marginBottom: 4,
    },
    storageSubtitle: {
        ...FONTS.body4,
        color: COLORS.textDim,
    },

    // Breadcrumb
    breadcrumbContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginBottom: 8,
        backgroundColor: '#05103A', // sticky header bg
    },
    breadcrumbPath: {
        ...FONTS.h4,
        color: COLORS.white,
        marginLeft: 8,
        flex: 1,
    },

    // FAB
    fabContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 100,
    },
    fabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingHorizontal: 20,
        width: '100%',
        backgroundColor: '#0F172A',
        borderTopWidth: 2,
        borderTopColor: COLORS.secondary,
        // No border radius for a docked "non-floating" look
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    fabCount: {
        ...FONTS.h4,
        color: COLORS.white,
    },
    fabMeta: {
        ...FONTS.body4,
        color: COLORS.textDim,
        fontSize: 12,
    },
    // Package Icon Styles
    packageIconContainer: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appIconOverlay: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 22,
        height: 22,
    },
    smallAppIcon: {
        width: 22,
        height: 22,
        borderRadius: 4,
    },
});

export default FileBrowser;
