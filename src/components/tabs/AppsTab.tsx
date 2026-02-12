import React, { memo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '../../store/fileStore';
import { COLORS } from '../../theme';
import { LegendList as LegendListOriginal } from '@legendapp/list';
const LegendList = LegendListOriginal as unknown as React.FC<any>;

interface AppsTabProps {
    renderAppItem: (props: { item: any }) => React.ReactElement;
    getFilteredData: (data: any[]) => any[];
    styles: any;
}

const AppsTab = memo(({ renderAppItem, getFilteredData, styles }: AppsTabProps) => {
    const { t } = useTranslation();

    // Subscribe to apps and selectedItems to ensure re-renders
    const apps = useFileStore(state => state.apps);
    const selectedItems = useFileStore(state => state.selectedItems);

    console.log('[AppsTab] RENDER - data count:', apps.data.length, 'status:', apps.status);

    // Handle loading state
    if (apps.status === 'loading' && apps.data.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: '#888', marginTop: 12 }}>
                    {t('common.loading_apps', { defaultValue: 'Loading apps...' })}
                </Text>
            </View>
        );
    }

    // Handle empty state after loading
    if (apps.status === 'success' && apps.data.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#888' }}>
                    {t('common.no_apps', { defaultValue: 'No apps found' })}
                </Text>
            </View>
        );
    }

    const filteredData = getFilteredData(apps.data);

    return (
        <LegendList
            data={filteredData}
            renderItem={renderAppItem}
            extraData={selectedItems}
            keyExtractor={(i: any, idx: number) => i.packageName || `app-${idx}`}
            numColumns={4}
            contentContainerStyle={styles.gridContent}
            estimatedItemSize={100}
            recycleItems={true}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
        />
    );
});

AppsTab.displayName = 'AppsTab';

export default AppsTab;
