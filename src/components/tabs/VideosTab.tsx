import React, { memo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '../../store/fileStore';
import { COLORS } from '../../theme';
import { LegendList as LegendListOriginal } from '@legendapp/list';
const LegendList = LegendListOriginal as unknown as React.FC<any>;

interface VideosTabProps {
    renderVideoItem: (props: { item: any }) => React.ReactElement;
    renderPermissionRequest: () => React.ReactElement;
    getFilteredData: (data: any[]) => any[];
    permissionLoading: boolean;
    styles: any;
}

const VideosTab = memo(({
    renderVideoItem,
    renderPermissionRequest,
    getFilteredData,
    permissionLoading,
    styles
}: VideosTabProps) => {
    const { t } = useTranslation();

    // Subscribe to videos, permission, AND selection state
    const videos = useFileStore(state => state.videos);
    const isPermissionGranted = useFileStore(state => state.isPermissionGranted);
    const selectedItems = useFileStore(state => state.selectedItems);

    console.log('[VideosTab] RENDER - data count:', videos.data.length, 'status:', videos.status, 'permission:', isPermissionGranted);

    // Permission not granted
    if (!isPermissionGranted || permissionLoading) {
        return renderPermissionRequest();
    }

    // Handle loading state
    if (videos.status === 'loading' && videos.data.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: '#888', marginTop: 12 }}>
                    {t('common.loading_videos', { defaultValue: 'Loading videos...' })}
                </Text>
            </View>
        );
    }

    // Handle empty state
    if (videos.status === 'success' && videos.data.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#888' }}>
                    {t('common.no_videos', { defaultValue: 'No videos found' })}
                </Text>
            </View>
        );
    }

    const filteredData = getFilteredData(videos.data);

    return (
        <LegendList
            data={filteredData}
            renderItem={renderVideoItem}
            extraData={selectedItems}
            keyExtractor={(i: any, idx: number) => `video-${i.id || idx}`}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={100}
            recycleItems={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
        />
    );
});

VideosTab.displayName = 'VideosTab';

export default VideosTab;
