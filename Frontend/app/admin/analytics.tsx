import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import {
  getOverviewStats,
  getTrendAnalytics,
  formatOccupancy,
} from '@/lib/adminApi';
import { OverviewStats, TrendAnalytics, HourlyStats, TrendDataPoint } from '@/lib/adminTypes';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 180;

// Period Selector Component
interface PeriodSelectorProps {
  selected: 'day' | 'week' | 'month';
  onSelect: (period: 'day' | 'week' | 'month') => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ selected, onSelect }) => {
  const periods: { value: 'day' | 'week' | 'month'; label: string }[] = [
    { value: 'day', label: 'Deň' },
    { value: 'week', label: 'Týždeň' },
    { value: 'month', label: 'Mesiac' },
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.value}
          style={[
            styles.periodButton,
            selected === period.value && styles.periodButtonActive,
          ]}
          onPress={() => onSelect(period.value)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selected === period.value && styles.periodButtonTextActive,
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Simple Bar Chart Component
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  showLabels?: boolean;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  showLabels = true,
  height = CHART_HEIGHT,
}) => {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const barWidth = (CHART_WIDTH - (data.length - 1) * 4) / data.length;

  return (
    <View style={[styles.barChart, { height }]}>
      <View style={styles.barChartBars}>
        {data.map((item, index) => {
          const barHeight = (item.value / max) * (height - 30);
          return (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    width: Math.max(barWidth - 2, 8),
                    backgroundColor: item.color || Colors.gradient.start,
                  },
                ]}
              />
              {showLabels && (
                <Text style={styles.barLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Line Chart Component (Simple SVG-like with Views)
interface LineChartProps {
  data: TrendDataPoint[];
  color?: string;
  height?: number;
  showDots?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  color = Colors.gradient.start,
  height = CHART_HEIGHT,
  showDots = true,
}) => {
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values) * 1.1;
  const min = Math.min(...values) * 0.9;
  const range = max - min || 1;

  const pointWidth = CHART_WIDTH / Math.max(data.length - 1, 1);

  return (
    <View style={[styles.lineChart, { height }]}>
      {/* Y-axis labels */}
      <View style={styles.yAxis}>
        <Text style={styles.yAxisLabel}>{Math.round(max)}</Text>
        <Text style={styles.yAxisLabel}>{Math.round((max + min) / 2)}</Text>
        <Text style={styles.yAxisLabel}>{Math.round(min)}</Text>
      </View>

      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Grid lines */}
        <View style={[styles.gridLine, { top: 0 }]} />
        <View style={[styles.gridLine, { top: '50%' }]} />
        <View style={[styles.gridLine, { top: '100%' }]} />

        {/* Data points and lines */}
        {data.map((point, index) => {
          const x = index * pointWidth;
          const y = height - 40 - ((point.value - min) / range) * (height - 60);

          return (
            <React.Fragment key={index}>
              {/* Line to next point */}
              {index < data.length - 1 && (
                <View
                  style={[
                    styles.lineSegment,
                    {
                      left: x + 4,
                      top: y + 4,
                      width: pointWidth,
                      transform: [
                        {
                          rotate: `${Math.atan2(
                            (height - 40 - ((data[index + 1].value - min) / range) * (height - 60)) - y,
                            pointWidth
                          )}rad`,
                        },
                      ],
                      backgroundColor: color,
                    },
                  ]}
                />
              )}
              {/* Data point */}
              {showDots && (
                <View
                  style={[
                    styles.dataPoint,
                    {
                      left: x,
                      top: y,
                      backgroundColor: color,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        <View style={styles.xAxis}>
          {data
            .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
            .map((point, index) => (
              <Text key={index} style={styles.xAxisLabel}>
                {point.label}
              </Text>
            ))}
        </View>
      </View>
    </View>
  );
};

// Donut Chart Component
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 140,
  strokeWidth = 24,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;

  return (
    <View style={[styles.donutChart, { width: size, height: size }]}>
      {data.map((item, index) => {
        const percentage = total > 0 ? item.value / total : 0;
        const angle = percentage * 360;
        const rotation = currentAngle;
        currentAngle += angle;

        return (
          <View
            key={index}
            style={[
              styles.donutSegment,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: 'transparent',
                borderTopColor: item.color,
                borderRightColor: percentage > 0.25 ? item.color : 'transparent',
                borderBottomColor: percentage > 0.5 ? item.color : 'transparent',
                borderLeftColor: percentage > 0.75 ? item.color : 'transparent',
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
          />
        );
      })}
      <View style={styles.donutCenter}>
        <Text style={styles.donutCenterValue}>{total}</Text>
        <Text style={styles.donutCenterLabel}>Celkom</Text>
      </View>
    </View>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconBg, { backgroundColor: `${color}20` }]}>
      <View style={[styles.colorDot, { backgroundColor: color }]} />
    </View>
    <Text style={styles.statCardValue}>{value}</Text>
    <Text style={styles.statCardTitle}>{title}</Text>
    {change !== undefined && (
      <View style={styles.changeContainer}>
        <Text
          style={[
            styles.changeText,
            { color: change >= 0 ? '#2ecc71' : '#e74c3c' },
          ]}
        >
          {change >= 0 ? '+' : ''}{Math.abs(change)}%
        </Text>
      </View>
    )}
  </View>
);

// Hourly Heatmap Component
interface HourlyHeatmapProps {
  data: HourlyStats[];
}

const HourlyHeatmap: React.FC<HourlyHeatmapProps> = ({ data }) => {
  const getColor = (rate: number) => {
    if (rate >= 80) return '#e74c3c';
    if (rate >= 60) return '#f39c12';
    if (rate >= 40) return '#f1c40f';
    if (rate >= 20) return '#2ecc71';
    return '#27ae60';
  };

  return (
    <View style={styles.heatmap}>
      <View style={styles.heatmapGrid}>
        {data.map((hour) => (
          <View key={hour.hour} style={styles.heatmapCell}>
            <View
              style={[
                styles.heatmapBar,
                { backgroundColor: getColor(hour.avgOccupancyRate) },
              ]}
            >
              <Text style={styles.heatmapValue}>
                {Math.round(hour.avgOccupancyRate)}%
              </Text>
            </View>
            <Text style={styles.heatmapLabel}>{hour.hour}:00</Text>
          </View>
        ))}
      </View>
      <View style={styles.heatmapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#27ae60' }]} />
          <Text style={styles.legendText}>Nízka</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f1c40f' }]} />
          <Text style={styles.legendText}>Stredná</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
          <Text style={styles.legendText}>Vysoká</Text>
        </View>
      </View>
    </View>
  );
};

// Main Analytics Screen
export default function AnalyticsScreen() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  // Animation values
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  const fetchData = useCallback(async () => {
    try {
      const [overviewData, trendsData] = await Promise.all([
        getOverviewStats(),
        getTrendAnalytics(period),
      ]);
      setOverview(overviewData);
      setTrends(trendsData);
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Animate content when data loads
  useEffect(() => {
    if (!loading && overview) {
      contentOpacity.value = withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      });
      contentTranslateY.value = withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      });
    }
  }, [loading, overview]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytika</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.gradient.start} />
          <Text style={styles.loadingText}>Načítavam analytiku...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const districtChartData = overview?.districts.map((d) => ({
    label: d.districtLabel.substring(0, 3),
    value: d.occupancyRate,
    color: d.color,
  })) || [];

  const typeChartData = overview
    ? Object.entries(overview.zonesByType).map(([type, count]) => ({
        label: type,
        value: count,
        color:
          type === 'garage'
            ? '#9b59b6'
            : type === 'street'
            ? '#3498db'
            : type === 'lot'
            ? '#2ecc71'
            : '#f39c12',
      }))
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytika</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View style={contentAnimatedStyle}>
          {/* Overview Stats */}
          <View style={styles.statsRow}>
            <StatCard
              title="Celková obsadenosť"
              value={formatOccupancy(overview?.overallOccupancyRate || 0)}
              change={2.5}
              color={Colors.gradient.start}
            />
            <StatCard
              title="Voľné miesta"
              value={overview?.freeSpots || 0}
              change={-5}
              color="#2ecc71"
            />
          </View>

          {/* Period Selector */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trend obsadenosti</Text>
              <PeriodSelector selected={period} onSelect={setPeriod} />
            </View>
            {trends && (
              <LineChart
              data={trends.occupancyTrend}
              color={Colors.gradient.start}
            />
          )}
        </View>

        {/* Revenue Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Odhad príjmov</Text>
          {trends && (
            <LineChart
              data={trends.revenueEstimateTrend}
              color="#2ecc71"
            />
          )}
        </View>

        {/* District Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Obsadenosť podľa okresov</Text>
          <BarChart data={districtChartData} maxValue={100} />
          <View style={styles.districtLegend}>
            {overview?.districts.map((d) => (
              <View key={d.district} style={styles.districtLegendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: d.color }]}
                />
                <Text style={styles.districtLegendText}>
                  {d.districtLabel}: {d.freeSpots}/{d.totalSpots}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Zone Types Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rozdelenie podľa typu</Text>
          <View style={styles.donutContainer}>
            <DonutChart data={typeChartData} />
            <View style={styles.donutLegend}>
              {typeChartData.map((item) => (
                <View key={item.label} style={styles.donutLegendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.donutLegendText}>
                    {item.label}: {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Hourly Pattern */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Denný vzor obsadenosti</Text>
          {overview?.hourlyStats && (
            <HourlyHeatmap
              data={overview.hourlyStats.filter((_, i) => i % 2 === 0)}
            />
          )}
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prehľad</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Špičková hodina</Text>
              <Text style={styles.insightText}>
                Najvyššia obsadenosť je zvyčajne medzi 10:00 - 14:00
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Rastúci trend</Text>
              <Text style={styles.insightText}>
                Obsadenosť sa v poslednom týždni zvýšila o 2.5%
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Najobľúbenejší okres</Text>
              <Text style={styles.insightText}>
                {overview?.districts?.[0]?.districtLabel || 'Centrum'} má najvyššiu priemernú obsadenosť
              </Text>
            </View>
          </View>
        </View>

          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  statsRow: {
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
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statCardTitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: Colors.gradient.start,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  barChart: {
    width: '100%',
  },
  barChartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingBottom: 24,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 6,
  },
  lineChart: {
    flexDirection: 'row',
    width: '100%',
  },
  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  yAxisLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.background,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
  },
  donutChart: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutSegment: {
    position: 'absolute',
  },
  donutCenter: {
    alignItems: 'center',
  },
  donutCenterValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  donutCenterLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  donutLegend: {
    gap: 8,
  },
  donutLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donutLegendText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  districtLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  districtLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  districtLegendText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  heatmap: {
    marginTop: 8,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatmapCell: {
    alignItems: 'center',
    width: (CHART_WIDTH - 40) / 12,
  },
  heatmapBar: {
    width: '100%',
    height: 50,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapValue: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  heatmapLabel: {
    fontSize: 9,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 100,
  },
});
