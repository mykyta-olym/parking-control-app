import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import {
  getZoneAnalytics,
  getZone,
  formatOccupancy,
  getOccupancyColor,
  getDistrictLabel,
} from '@/lib/adminApi';
import { ZoneAnalytics, AdminZone, HourlyStats, DailyStats } from '@/lib/adminTypes';
import Header from '@/components/Header';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

// Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => (
  <Animated.View entering={FadeInDown.springify()} style={styles.statCard}>
    <View style={[styles.statIconBg, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </Animated.View>
);

// Daily Stats Chart
interface DailyChartProps {
  data: DailyStats[];
}

const DailyChart: React.FC<DailyChartProps> = ({ data }) => {
  const maxOccupied = Math.max(...data.map(d => d.peakOccupied), 1);
  
  return (
    <View style={styles.dailyChart}>
      {data.slice(0, 7).reverse().map((day, index) => {
        const height = (day.avgOccupancyRate / 100) * 80;
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('sk', { weekday: 'short' });
        
        return (
          <View key={index} style={styles.dailyBar}>
            <Text style={styles.dailyValue}>{Math.round(day.avgOccupancyRate)}%</Text>
            <Animated.View
              entering={FadeInDown.delay(index * 50)}
              style={[
                styles.dailyBarFill,
                {
                  height,
                  backgroundColor: getOccupancyColor(day.avgOccupancyRate),
                },
              ]}
            />
            <Text style={styles.dailyLabel}>{dayName}</Text>
          </View>
        );
      })}
    </View>
  );
};

// Hourly Pattern Chart
interface HourlyChartProps {
  data: HourlyStats[];
  peakHours: number[];
}

const HourlyChart: React.FC<HourlyChartProps> = ({ data, peakHours }) => {
  const filteredData = data.filter((_, i) => i % 2 === 0); // Show every 2nd hour
  
  return (
    <View style={styles.hourlyChart}>
      {filteredData.map((hour, index) => {
        const isPeak = peakHours.includes(hour.hour);
        const height = (hour.avgOccupancyRate / 100) * 60;
        
        return (
          <View key={index} style={styles.hourlyBar}>
            <Animated.View
              entering={FadeInDown.delay(index * 30)}
              style={[
                styles.hourlyBarFill,
                {
                  height,
                  backgroundColor: isPeak ? '#e74c3c' : Colors.gradient.start,
                },
              ]}
            />
            <Text style={styles.hourlyLabel}>{hour.hour}h</Text>
          </View>
        );
      })}
    </View>
  );
};

// Peak Hours Display
interface PeakHoursProps {
  hours: number[];
}

const PeakHours: React.FC<PeakHoursProps> = ({ hours }) => {
  if (hours.length === 0) return null;
  
  const formatHour = (h: number) => `${h}:00`;
  const ranges: string[] = [];
  
  let start = hours[0];
  let prev = hours[0];
  
  for (let i = 1; i <= hours.length; i++) {
    if (i === hours.length || hours[i] !== prev + 1) {
      if (start === prev) {
        ranges.push(formatHour(start));
      } else {
        ranges.push(`${formatHour(start)} - ${formatHour(prev + 1)}`);
      }
      if (i < hours.length) {
        start = hours[i];
        prev = hours[i];
      }
    } else {
      prev = hours[i];
    }
  }
  
  return (
    <View style={styles.peakHours}>
      {ranges.map((range, index) => (
        <View key={index} style={styles.peakHourBadge}>
          <Ionicons name="time" size={14} color="#e74c3c" />
          <Text style={styles.peakHourText}>{range}</Text>
        </View>
      ))}
    </View>
  );
};

// Main Zone Analytics Screen
export default function ZoneAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [zone, setZone] = useState<AdminZone | null>(null);
  const [analytics, setAnalytics] = useState<ZoneAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    try {
      const [zoneData, analyticsData] = await Promise.all([
        getZone(id),
        getZoneAnalytics(id),
      ]);
      setZone(zoneData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Zone analytics fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Analytika" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.gradient.start} />
        </View>
      </SafeAreaView>
    );
  }

  if (!zone || !analytics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Analytika" showBackButton />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
          <Text style={styles.errorText}>Nepodarilo sa načítať analytiku</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Analytika" showBackButton />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Zone Info Header */}
        <Animated.View entering={FadeInDown.delay(0)}>
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            style={styles.headerCard}
          >
            <Text style={styles.zoneName}>{zone.name}</Text>
            <Text style={styles.zoneAddress}>
              {zone.address || getDistrictLabel(zone.district)}
            </Text>
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>
                  {formatOccupancy(analytics.currentOccupancyRate)}
                </Text>
                <Text style={styles.headerStatLabel}>Obsadenosť</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{zone.freeSpots}</Text>
                <Text style={styles.headerStatLabel}>Voľných</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{zone.totalSpots}</Text>
                <Text style={styles.headerStatLabel}>Celkom</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Priemerná obsadenosť"
            value={formatOccupancy(analytics.currentOccupancyRate)}
            icon="speedometer"
            color={getOccupancyColor(analytics.currentOccupancyRate)}
          />
          <StatCard
            title="Odhad denných príjmov"
            value={`${analytics.avgDailyRevenueEstimate.toFixed(0)}€`}
            icon="cash"
            color="#2ecc71"
          />
        </View>

        {/* Peak Hours */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Špičkové hodiny</Text>
          <Text style={styles.sectionSubtitle}>
            Najvyššia obsadenosť (&gt;70%)
          </Text>
          <PeakHours hours={analytics.peakHours} />
        </Animated.View>

        {/* Daily Pattern */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>Posledných 7 dní</Text>
          <DailyChart data={analytics.dailyStats} />
        </Animated.View>

        {/* Hourly Pattern */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Denný vzor</Text>
          <Text style={styles.sectionSubtitle}>
            Priemerná obsadenosť počas dňa
          </Text>
          <HourlyChart
            data={analytics.hourlyPattern}
            peakHours={analytics.peakHours}
          />
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.gradient.start }]} />
              <Text style={styles.legendText}>Normálna</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>Špička</Text>
            </View>
          </View>
        </Animated.View>

        {/* Statistics Table */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
          <Text style={styles.sectionTitle}>Detailná štatistika</Text>
          <View style={styles.statsTable}>
            {analytics.dailyStats.slice(0, 5).map((day, index) => {
              const date = new Date(day.date);
              return (
                <View key={index} style={styles.statsTableRow}>
                  <Text style={styles.statsTableDate}>
                    {date.toLocaleDateString('sk', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                  <View style={styles.statsTableValues}>
                    <Text style={styles.statsTableValue}>
                      {Math.round(day.avgOccupied)} obsad.
                    </Text>
                    <Text style={[styles.statsTableValue, { color: '#2ecc71' }]}>
                      {Math.round(day.avgFree)} voľ.
                    </Text>
                    <Text style={[styles.statsTableValue, { color: getOccupancyColor(day.avgOccupancyRate) }]}>
                      {Math.round(day.avgOccupancyRate)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Insights */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Prehľady</Text>
          <View style={styles.insight}>
            <Ionicons name="bulb" size={20} color="#f39c12" />
            <Text style={styles.insightText}>
              Najvyššia obsadenosť je zvyčajne o{' '}
              <Text style={styles.insightBold}>
                {analytics.peakHours[0] || 12}:00
              </Text>
            </Text>
          </View>
          <View style={styles.insight}>
            <Ionicons name="trending-up" size={20} color="#2ecc71" />
            <Text style={styles.insightText}>
              Priemerný denný príjem:{' '}
              <Text style={styles.insightBold}>
                {analytics.avgDailyRevenueEstimate.toFixed(2)}€
              </Text>
            </Text>
          </View>
          <View style={styles.insight}>
            <Ionicons name="time" size={20} color="#3498db" />
            <Text style={styles.insightText}>
              Odporúčame navštíviť mimo špičky:{' '}
              <Text style={styles.insightBold}>6:00 - 8:00</Text>
            </Text>
          </View>
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  headerCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  zoneName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  zoneAddress: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  headerStatItem: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statTitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  peakHours: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  peakHourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  peakHourText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
  },
  dailyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 8,
  },
  dailyBar: {
    alignItems: 'center',
    flex: 1,
  },
  dailyValue: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  dailyBarFill: {
    width: 28,
    borderRadius: 6,
    minHeight: 4,
  },
  dailyLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 6,
  },
  hourlyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    marginTop: 8,
  },
  hourlyBar: {
    alignItems: 'center',
    flex: 1,
  },
  hourlyBarFill: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  hourlyLabel: {
    fontSize: 9,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statsTable: {
    marginTop: 8,
  },
  statsTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  statsTableDate: {
    fontSize: 13,
    color: Colors.text.primary,
    flex: 1,
  },
  statsTableValues: {
    flexDirection: 'row',
    gap: 16,
  },
  statsTableValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    minWidth: 60,
    textAlign: 'right',
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  insightBold: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  bottomSpacing: {
    height: 100,
  },
});
