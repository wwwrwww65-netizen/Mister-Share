import React, { memo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '../../store/fileStore';
import { COLORS } from '../../theme';
import { LegendList as LegendListOriginal } from '@legendapp/list';
const LegendList = LegendListOriginal as unknown as React.FC<any>;

interface MusicTabProps {
    renderMusicItem: (props: { item: any }) => React.ReactElement;
    renderPermissionRequest: () => React.ReactElement;
    getFilteredData: (data: any[]) => any[];
    permissionLoading: boolean;
    styles: any;
}

const MusicTab = memo(({
    renderMusicItem,
    renderPermissionRequest,
    getFilteredData,
    permissionLoading,
    styles
}: MusicTabProps) => {
    const { t } = useTranslation();

    // Subscribe to music data, permission, AND selection
    const music = useFileStore(state => state.music);
    const isPermissionGranted = useFileStore(state => state.isPermissionGranted);
    const selectedItems = useFileStore(state => state.selectedItems);

    console.log('[MusicTab] RENDER - data count:', music.data.length, 'status:', music.status, 'permission:', isPermissionGranted);

    // Permission not granted
    if (!isPermissionGranted || permissionLoading) {
        return renderPermissionRequest();
    }

    // Handle loading state
    if (music.status === 'loading' && music.data.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: '#888', marginTop: 12 }}>
                    {t('common.loading_music', { defaultValue: 'Loading music...' })}
                </Text>
            </View>
        );
    }

    // Handle empty state
    if (music.status === 'success' && music.data.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#888' }}>
                    {t('common.no_music', { defaultValue: 'No music found' })}
                </Text>
            </View>
        );
    }

    const filteredData = getFilteredData(music.data);

    return (
        <LegendList
            data={filteredData}
            renderItem={renderMusicItem}
            extraData={selectedItems}
            keyExtractor={(i: any, idx: number) => `music-${i.id || idx}`}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={80}
            recycleItems={true}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
        />
    );
});

MusicTab.displayName = 'MusicTab';

export default MusicTab;
