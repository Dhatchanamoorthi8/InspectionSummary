import React, { useState, useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { Card, CardHeader, CardBody } from './ui/card';
import { useColorModeValue } from './ui/color-mode';
import { Select } from './ui/select';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { LucideIcon, CheckCircle2, AlertOctagon, TrendingUp } from 'lucide-react';
import { RunChartPoint } from '../types';

export interface RunChartCardProps {
  title: string;
  parameterKey: 'bhn' | 'ys' | 'uts' | 'elongation';
  threshold: number;
  unit: string;
  specLabel: string;
  data: RunChartPoint[];
  colorTheme?: 'blue' | 'green' | 'purple' | 'amber';
  icon?: LucideIcon;
  height?: number;
}

const CustomDot = (props: any) => {
  const { cx, cy, payload, threshold } = props;
  if (!cx || !cy || !payload) return null;
  const val = Number(payload.value);
  const isPassing = val >= threshold;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={isPassing ? 4.5 : 5.5}
      fill={isPassing ? '#10B981' : '#EF4444'}
      stroke={isPassing ? '#059669' : '#B91C1C'}
      strokeWidth={2}
    />
  );
};

const CustomTooltip = ({ active, payload, threshold, unit, specLabel }: any) => {
  if (active && payload && payload.length) {
    const pt: RunChartPoint = payload[0].payload?.raw;
    const val = Number(payload[0].value);
    const isPassing = val >= threshold;

    return (
      <Box
        bg="gray.900"
        color="white"
        p={3}
        borderRadius="md"
        boxShadow="2xl"
        borderWidth="1px"
        borderColor={isPassing ? 'green.600' : 'red.600'}
        fontSize="xs"
        minW="220px"
      >
        <Flex justify="space-between" align="center" mb={1.5} pb={1} borderBottomWidth="1px" borderColor="gray.700">
          <Text fontWeight="700" color="gray.200">
            {pt?.heatBatchNumber || `Batch #${payload[0].payload?.index}`}
          </Text>
          <Badge
            colorPalette={isPassing ? 'green' : 'red'}
            variant="solid"
            fontSize="3xs"
            px={1.5}
            py={0}
          >
            {isPassing ? 'OK / PASS' : 'NOT OK / REJ'}
          </Badge>
        </Flex>

        <HStack justify="space-between" mb={1}>
          <Text color="gray.400">Date:</Text>
          <Text fontWeight="700" color="blue.300">
            {(pt?.reportDate || pt?.date || '').split('T')[0] || '—'}
          </Text>
        </HStack>

        <HStack justify="space-between" mb={1}>
          <Text color="gray.400">Request #:</Text>
          <Text fontWeight="600" fontFamily="mono">{pt?.requestNumber || '—'}</Text>
        </HStack>

        <HStack justify="space-between" mb={1}>
          <Text color="gray.400">Part No:</Text>
          <Text fontWeight="600" fontFamily="mono">{pt?.partNumber || '—'}</Text>
        </HStack>

        <Flex
          justify="space-between"
          align="center"
          mt={2}
          pt={1.5}
          borderTopWidth="1px"
          borderColor="gray.800"
        >
          <Text color="gray.300" fontWeight="600">Observed Value:</Text>
          <Text
            fontSize="sm"
            fontWeight="800"
            color={isPassing ? 'green.400' : 'red.400'}
          >
            {val.toFixed(2)} {unit}
          </Text>
        </Flex>

        <HStack justify="space-between" mt={0.5}>
          <Text fontSize="2xs" color="gray.500">Spec Requirement:</Text>
          <Text fontSize="2xs" color="gray.400" fontWeight="600">{specLabel}</Text>
        </HStack>
      </Box>
    );
  }
  return null;
};

export const RunChartCard: React.FC<RunChartCardProps> = ({
  title,
  parameterKey,
  threshold,
  unit,
  specLabel,
  data = [],
  colorTheme = 'blue',
  icon: IconComponent = TrendingUp,
  height = 285,
}) => {
  const [selectedPartNo, setSelectedPartNo] = useState<string>('ALL');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('industrial.200', 'gray.700');
  const titleColor = useColorModeValue('industrial.900', 'white');
  const axisColor = useColorModeValue('#64748B', '#94A3B8');
  const gridColor = useColorModeValue('#E2E8F0', '#334155');
  const statsBg = useColorModeValue('gray.50', 'rgba(255, 255, 255, 0.03)');
  const statsBorder = useColorModeValue('gray.200', 'gray.700');

  // Extract distinct part numbers from the available dataset
  const partNumberOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach((p) => {
      if (p.partNumber) set.add(p.partNumber);
    });
    const list = Array.from(set).sort();
    return [
      { value: 'ALL', label: `All Part Numbers (${list.length})` },
      ...list.map((pn) => ({ value: pn, label: pn })),
    ];
  }, [data]);

  // Filter data points by selected part number
  const filteredData = useMemo(() => {
    if (selectedPartNo === 'ALL') return data;
    return data.filter((p) => p.partNumber === selectedPartNo);
  }, [data, selectedPartNo]);

  // Transform data points for Recharts - Option A: Clean Heat Batch Number
  const chartData = useMemo(() => {
    return filteredData.map((pt, i) => {
      const val = Number(pt[parameterKey]) || 0;
      const rawDate = (pt.reportDate || pt.date || '').split('T')[0];
      const batchLabel = pt.heatBatchNumber ? pt.heatBatchNumber : `Batch #${i + 1}`;

      return {
        index: i + 1,
        label: batchLabel,
        batchNumber: batchLabel,
        date: rawDate || '—',
        value: val,
        raw: pt,
      };
    });
  }, [filteredData, parameterKey]);

  // Compute Process Metrics
  const stats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) {
      return { total: 0, passCount: 0, failCount: 0, passRate: 0, avg: 0, min: 0, max: 0 };
    }
    const values = filteredData.map((p) => Number(p[parameterKey]) || 0);
    const passCount = values.filter((v) => v >= threshold).length;
    const failCount = total - passCount;
    const passRate = Math.round((passCount / total) * 1000) / 10;
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = Math.round((sum / total) * 100) / 100;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { total, passCount, failCount, passRate, avg, min, max };
  }, [filteredData, parameterKey, threshold]);

  // Determine line color from theme
  const lineColor = {
    blue: '#2563EB',
    green: '#059669',
    purple: '#7C3AED',
    amber: '#D97706',
  }[colorTheme];

  // Dynamic Y-axis scale with padding around min, max, and threshold
  const [yMin, yMax] = useMemo(() => {
    if (stats.total === 0) return [Math.floor(threshold * 0.8), Math.ceil(threshold * 1.2)];
    const lower = Math.min(stats.min, threshold);
    const upper = Math.max(stats.max, threshold);
    const padding = (upper - lower) * 0.2 || threshold * 0.1;
    const calculatedMin = Math.max(0, Math.floor((lower - padding) * 10) / 10);
    const calculatedMax = Math.ceil((upper + padding) * 10) / 10;
    return [calculatedMin, calculatedMax];
  }, [stats, threshold]);

  return (
    <Card
      bg={cardBg}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="sm"
      overflow="hidden"
    >
      <CardHeader p={3.5} pb={2}>
        <Flex justify="space-between" align="center" wrap={{ base: 'wrap', md: 'nowrap' }} gap={2}>
          {/* Left: Title + Spec Badge */}
          <HStack gap={2} align="center" flex={1} minW={0}>
            <Flex
              w={7}
              h={7}
              borderRadius="md"
              bg={`${colorTheme}.50`}
              align="center"
              justify="center"
              color={lineColor}
              flexShrink={0}
            >
              <Icon as={IconComponent} boxSize={4} />
            </Flex>
            <Box minW={0}>
              <HStack gap={2} align="center" wrap="wrap">
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color={titleColor}
                  textTransform="uppercase"
                  letterSpacing="wide"
                  whiteSpace="nowrap"
                >
                  {title}
                </Text>
                <Badge
                  size="xs"
                  colorPalette={stats.failCount > 0 ? 'red' : 'green'}
                  variant="subtle"
                  fontWeight="700"
                  px={1.5}
                  flexShrink={0}
                >
                  {specLabel}
                </Badge>
              </HStack>
            </Box>
          </HStack>

          {/* Right: Inside-Chart Part Number Selector */}
          <Box id={`run-chart-part-${parameterKey}`} w={{ base: 'full', md: '165px' }} flexShrink={0}>
            <Select
              size="xs"
              value={selectedPartNo}
              onChange={(val) => setSelectedPartNo(val)}
              options={partNumberOptions}
              placeholder="All Part Numbers"
              isSearchable={false}
            />
          </Box>
        </Flex>

        {/* Process Capability Ribbon */}
        <Flex
          mt={2.5}
          p={2}
          bg={statsBg}
          borderRadius="md"
          borderWidth="1px"
          borderColor={statsBorder}
          justify="space-between"
          align="center"
          fontSize="2xs"
          wrap="wrap"
          gap={2}
        >
          <HStack gap={1.5}>
            <Text color="gray.500" fontWeight="600">Sample Count:</Text>
            <Text fontWeight="800" color={titleColor}>
              {stats.total} Batches
            </Text>
          </HStack>

          <HStack gap={1.5}>
            <Text color="gray.500" fontWeight="600">Mean (Avg):</Text>
            <Text fontWeight="800" color={titleColor}>
              {stats.avg.toFixed(2)} {unit}
            </Text>
          </HStack>

          <HStack gap={1.5}>
            <Text color="gray.500" fontWeight="600">Range (Min/Max):</Text>
            <Text fontWeight="700" color="gray.600">
              {stats.min.toFixed(1)} – {stats.max.toFixed(1)}
            </Text>
          </HStack>

          <HStack gap={1.5}>
            <Text color="gray.500" fontWeight="600">Quality Pass Rate:</Text>
            <Badge
              size="xs"
              colorPalette={stats.passRate >= 80 ? 'green' : 'red'}
              variant="solid"
              fontWeight="800"
            >
              {stats.passRate}% OK ({stats.passCount}/{stats.total})
            </Badge>
          </HStack>
        </Flex>
      </CardHeader>

      <CardBody p={3.5} pt={1}>
        {chartData.length === 0 ? (
          <Flex
            h={`${height}px`}
            w="full"
            align="center"
            justify="center"
            direction="column"
            gap={2}
            color="gray.400"
          >
            <Icon as={AlertOctagon} boxSize={8} color="gray.300" />
            <Text fontSize="xs" fontWeight="600">
              No inspection test data found for {selectedPartNo === 'ALL' ? 'the selected date range' : selectedPartNo}
            </Text>
          </Flex>
        ) : (
          <Box h={`${height}px`} w="full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 25, left: 45, bottom: 52 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisColor, fontSize: 10, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  angle={-35}
                  textAnchor="end"
                  height={58}
                  interval={chartData.length > 20 ? 'preserveStartEnd' : 0}
                />
                <YAxis
                  width={65}
                  domain={[yMin, yMax]}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  unit={` ${unit}`}
                />
                <Tooltip
                  content={
                    <CustomTooltip
                      threshold={threshold}
                      unit={unit}
                      specLabel={specLabel}
                    />
                  }
                />
                {/* Lower Specification Limit (LSL) Reference Line */}
                <ReferenceLine
                  y={threshold}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `LSL: ${specLabel}`,
                    position: 'insideTopLeft',
                    fill: '#DC2626',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={<CustomDot threshold={threshold} />}
                  activeDot={{ r: 6, stroke: '#1E293B', strokeWidth: 2 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardBody>
    </Card>
  );
};
