import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { Card, CardHeader, CardBody } from './ui/card';
import { useColorModeValue } from './ui/color-mode';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { qcColors } from '../theme/colors';

interface StatusBarChartProps {
  data: { status: string; count: number }[];
  title?: string;
  height?: number;
}

export const StatusBarChart: React.FC<StatusBarChartProps> = ({
  data,
  title = 'Requests by Status',
  height = 260,
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('industrial.200', 'gray.700');
  const titleColor = useColorModeValue('industrial.800', 'white');
  const axisColor = useColorModeValue('#64748B', '#94A3B8');
  const axisLineColor = useColorModeValue('#CBD5E1', '#334155');
  const cursorFill = useColorModeValue('rgba(0, 0, 0, 0.04)', 'rgba(255, 255, 255, 0.06)');
  const tooltipBg = useColorModeValue('#1E293B', '#0F172A');
  const tooltipBorder = useColorModeValue('#CBD5E1', '#334155');

  const getBarColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('completed')) return qcColors.status.ok.bg;
    if (s.includes('not ok') || s.includes('fail')) return qcColors.status.notOk.bg;
    if (s.includes('in progress') || s.includes('assigned') || s.includes('pending'))
      return qcColors.status.pending.bg;
    return qcColors.status.draft.bg;
  };

  return (
    <Card
      bg={cardBg}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <CardHeader pb={0} pt={4} px={4}>
        <Text fontSize="sm" fontWeight="700" color={titleColor} textTransform="uppercase" letterSpacing="wide">
          {title}
        </Text>
      </CardHeader>
      <CardBody p={4}>
        <Box h={`${height}px`} w="full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <XAxis
                dataKey="status"
                tick={{ fill: axisColor, fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: axisLineColor }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
                itemStyle={{ color: '#FFFFFF' }}
                cursor={{ fill: cursorFill }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={45}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardBody>
    </Card>
  );
};

interface StatusPieChartProps {
  data: { name: string; value?: number; count?: number }[];
  title?: string;
  height?: number;
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({
  data,
  title = 'Inspection Results Breakdown',
  height = 260,
}) => {
  const chartData = (data || []).map((d) => ({
    name: d.name,
    value: d.value ?? d.count ?? 0,
  }));
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('industrial.200', 'gray.700');
  const titleColor = useColorModeValue('industrial.800', 'white');
  const tooltipBg = useColorModeValue('#1E293B', '#0F172A');
  const tooltipBorder = useColorModeValue('#CBD5E1', '#334155');
  const legendColor = useColorModeValue('#334155', '#E2E8F0');

  const COLORS = [
    qcColors.status.ok.bg,
    qcColors.status.notOk.bg,
    qcColors.status.pending.bg,
    qcColors.status.draft.bg,
    '#2563EB',
    '#7C3AED',
  ];

  return (
    <Card
      bg={cardBg}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <CardHeader pb={0} pt={4} px={4}>
        <Text fontSize="sm" fontWeight="700" color={titleColor} textTransform="uppercase" letterSpacing="wide">
          {title}
        </Text>
      </CardHeader>
      <CardBody p={4}>
        <Box h={`${height}px`} w="full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
                itemStyle={{ color: '#FFFFFF' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: legendColor,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardBody>
    </Card>
  );
};

export const DistributionDonut = StatusPieChart;

