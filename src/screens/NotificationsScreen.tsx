import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SIZES } from '../theme';
import AppBackground from '../components/modern/AppBackground';
import ModernHeader from '../components/modern/ModernHeader';
import GlassCard from '../components/modern/GlassCard';

const NotificationsScreen = ({ navigation }: any) => {
    const { t } = useTranslation();

    // Mock Data for demonstration since we don't persist notifications yet
    const [notifications, setNotifications] = useState([
        {
            id: '1',
            title: 'تلميح يومي 💡',
            message: 'مساحتك ممتلئة؟ انقل ملفاتك الآن إلى الكمبيوتر وحرر المساحة!',
            time: 'الآن',
            type: 'tip',
            read: false
        },
        {
            id: '2',
            title: 'تحديث أمني 🔒',
            message: 'تم تفعيل التشفير الكامل لجميع عمليات النقل الخاصة بك.',
            time: 'منذ 2 ساعة',
            type: 'security',
            read: true
        },
        {
            id: '3',
            title: 'شارك مع الأصدقاء 📲',
            message: 'استمتع بنقل التطبيقات بسرعة البرق مع MisterShare.',
            time: 'أمس',
            type: 'promo',
            read: true
        }
    ]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'tip': return 'lightbulb';
            case 'security': return 'shield';
            case 'promo': return 'rocket-launch';
            default: return 'notifications';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'tip': return '#FFD700'; // Gold
            case 'security': return '#00FA9A'; // SpringGreen
            case 'promo': return '#FF69B4'; // HotPink
            default: return COLORS.primary;
        }
    };

    const renderItem = ({ item }: any) => (
        <GlassCard style={[styles.card, !item.read && styles.unreadCard]}>
            <View style={styles.iconContainer}>
                 <View style={[styles.iconCircle, { backgroundColor: getColor(item.type) + '20' }]}>
                    <Icon name={getIcon(item.type)} size={24} color={getColor(item.type)} />
                 </View>
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>
                <Text style={styles.message}>{item.message}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
        </GlassCard>
    );

    return (
        <AppBackground>
            <ModernHeader title={t('settings.notifications')} showBack centerTitle />
            
            <View style={styles.container}>
                {notifications.length > 0 ? (
                    <FlatList
                        data={notifications}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Icon name="notifications-none" size={80} color={COLORS.textDim} />
                        <Text style={styles.emptyText}>{t('connect.no_devices')}</Text> 
                        {/* Using existing translation as fallback, ideally add 'no_notifications' */}
                    </View>
                )}
            </View>
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: SIZES.padding,
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
    },
    unreadCard: {
        borderColor: COLORS.primary + '80',
        borderWidth: 1,
        backgroundColor: COLORS.white + '10', // Slightly lighter for unread
    },
    iconContainer: {
        marginRight: 16,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    time: {
        color: COLORS.textDim,
        fontSize: 12,
    },
    message: {
        color: COLORS.textDim,
        fontSize: 14,
        lineHeight: 20,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        position: 'absolute',
        top: 16,
        right: 16,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -50,
    },
    emptyText: {
        color: COLORS.textDim,
        marginTop: 16,
        fontSize: 16,
    }
});

export default NotificationsScreen;
