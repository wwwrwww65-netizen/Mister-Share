import React, { memo, useMemo } from 'react';
import { View, SectionList, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '../../store/fileStore';
import { LegendList as LegendListOriginal } from '@legendapp/list';
const LegendList = LegendListOriginal as unknown as React.FC<any>;

interface PhotosTabProps {
    renderPhotoItem: (props: { item: any }) => React.ReactElement;
    renderPermissionRequest: () => React.ReactElement;
    renderPhotoSectionHeader: (props: any) => React.ReactElement;
    getFilteredData: (data: any[]) => any[];
    searchQuery: string;
    permissionLoading: boolean;
    styles: any;
}

const PhotosTab = memo(({
    renderPhotoItem,
    renderPermissionRequest,
    renderPhotoSectionHeader,
    getFilteredData,
    searchQuery,
    permissionLoading,
    styles
}: PhotosTabProps) => {
    const { t } = useTranslation();

    // Subscribe to photos, permission, AND selection state
    const photos = useFileStore(state => state.photos);
    const isPermissionGranted = useFileStore(state => state.isPermissionGranted);
    const selectedItems = useFileStore(state => state.selectedItems);

    console.log('[PhotosTab] RENDER - data count:', photos.data.length, 'permission:', isPermissionGranted);

    // Compute groupPhotosByDate INSIDE this component - prevents prop changes from parent
    const groupPhotosByDate = useMemo(() => {
        if (!isPermissionGranted || permissionLoading) return [];
        const sourceData = photos.data || [];
        if (sourceData.length === 0) return [];

        // Group by date string
        const groups: { [key: string]: any[] } = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayLabel = t('common.today', { defaultValue: 'Today' });
        const yesterdayLabel = t('common.yesterday', { defaultValue: 'Yesterday' });

        sourceData.forEach((photo: any) => {
            const timestamp = (photo.dateModified || photo.dateAdded || 0) * 1000;
            const date = new Date(timestamp);
            date.setHours(0, 0, 0, 0);

            let dateKey: string;
            if (date.getTime() === today.getTime()) {
                dateKey = todayLabel;
            } else if (date.getTime() === yesterday.getTime()) {
                dateKey = yesterdayLabel;
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
        const sections = Object.keys(groups).map(title => {
            const allPhotos = groups[title];
            const rows: any[][] = [];
            for (let i = 0; i < allPhotos.length; i += 3) {
                rows.push(allPhotos.slice(i, i + 3));
            }
            return {
                title,
                data: rows,
                count: allPhotos.length,
                timestamp: (allPhotos[0]?.dateModified || allPhotos[0]?.dateAdded || 0) * 1000
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
    }, [photos.data, isPermissionGranted, permissionLoading, t]);

    if (!isPermissionGranted || permissionLoading) {
        return renderPermissionRequest();
    }

    // Handle empty state
    if (photos.data.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#888' }}>{t('common.loading', { defaultValue: 'Loading...' })}</Text>
            </View>
        );
    }

    if (searchQuery.length > 0) {
        return (
            <LegendList
                data={getFilteredData(photos.data)}
                renderItem={renderPhotoItem}
                extraData={selectedItems}
                keyExtractor={(i: any, idx: number) => `photo-${i.id || idx}`}
                numColumns={3}
                contentContainerStyle={styles.gridContent}
                estimatedItemSize={100}
                recycleItems={true}
            />
        );
    }

    // Don't render SectionList with empty sections
    if (groupPhotosByDate.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#888' }}>{t('common.no_photos', { defaultValue: 'No photos' })}</Text>
            </View>
        );
    }

    return (
        <SectionList
            sections={groupPhotosByDate}
            extraData={selectedItems}
            renderItem={({ item: rowPhotos }: any) => (
                <View style={{ flexDirection: 'row' }}>
                    {rowPhotos.map((photo: any, i: number) => (
                        <View key={photo.id || photo.path || i} style={{ flex: 1, maxWidth: '33.33%' }}>
                            {renderPhotoItem({ item: photo })}
                        </View>
                    ))}
                    {rowPhotos.length < 3 && Array(3 - rowPhotos.length).fill(null).map((_: any, i: number) => (
                        <View key={`empty-${i}`} style={{ flex: 1, maxWidth: '33.33%' }} />
                    ))}
                </View>
            )}
            renderSectionHeader={renderPhotoSectionHeader}
            keyExtractor={(item, idx) => `row-${idx}`}
            contentContainerStyle={styles.gridContent}
            stickySectionHeadersEnabled={true}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={3}
            removeClippedSubviews={true}
        />
    );
});

PhotosTab.displayName = 'PhotosTab';

export default PhotosTab;
