import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  SimpleGrid,
  HStack,
  Badge,
} from '@chakra-ui/react';
import {
  Plus,
  RefreshCw,
  FileCheck,
  FileClock,
  FileX,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  Flame,
  ShieldCheck,
  AlertOctagon,
  Activity,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import { KPICard } from '../components/KPICard';
import { RunChartCard } from '../components/RunChartCard';
import { StatusBarChart, DistributionDonut } from '../components/Charts';
import { DataTable, Column, useToast, useColorModeValue, Select, ChakraDateRangePicker } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { CreateRequestModal } from './CreateRequestModal';
import { dashboardApi, partsApi } from '../services/api';
import { ProductionDashboardData } from '../types';

export const ProductionDashboardPage: React.FC = () => {
  const [data, setData] = useState<ProductionDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filter state in the top right corner
  const [partNames, setPartNames] = useState<string[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const navigate = useNavigate();
  const toast = useToast();

  const partNumberColor = useColorModeValue('gray.600', 'gray.300');
  const sectionHeadingColor = useColorModeValue('industrial.800', 'white');
  const filterBannerBg = useColorModeValue('blue.50', 'rgba(37, 99, 235, 0.15)');
  const filterBannerBorder = useColorModeValue('blue.200', 'blue.800');
  const filterTextColor = useColorModeValue('blue.900', 'blue.100');

  const loadPartNames = async () => {
    try {
      const parts = await partsApi.getPartNames();
      setPartNames(parts);
    } catch {
      // Handled silently
    }
  };

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await dashboardApi.getProductionDashboard({
        partName: selectedPart !== 'ALL' ? selectedPart : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Failed to load dashboard metrics',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPartNames();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [selectedPart, fromDate, toDate]);

  const handleResetFilters = () => {
    setSelectedPart('ALL');
    setFromDate('');
    setToDate('');
  };

  const hasActiveFilters = selectedPart !== 'ALL' || !!fromDate || !!toDate;

  const completedColumns: Column<{
    requestId: string;
    requestNumber: string;
    date: string;
    partName: string;
    partNumber: string;
    assignedInspector: string;
    overallStatus: string;
  }>[] = [
    {
      header: 'Request Number',
      accessor: 'requestNumber',
      render: (row) => (
        <Text fontWeight="700" color="brand.600" fontFamily="mono">
          {row.requestNumber}
        </Text>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
    },
    {
      header: 'Part Name',
      accessor: 'partName',
      render: (row) => <Text fontWeight="600">{row.partName}</Text>,
    },
    {
      header: 'Part Number',
      accessor: 'partNumber',
      render: (row) => (
        <Text fontFamily="mono" color={partNumberColor}>
          {row.partNumber}
        </Text>
      ),
    },
    {
      header: 'Inspector',
      accessor: 'assignedInspector',
      render: (row) => row.assignedInspector || '—',
    },
    {
      header: 'QC Result',
      accessor: 'overallStatus',
      render: (row) => <StatusBadge status={row.overallStatus} />,
    },
    {
      header: 'Action',
      render: (row) => (
        <Button
          size="xs"
          variant="outline"
          onClick={() => navigate(`/requests/${row.requestId}`)}
        >
          <Eye size={13} style={{ marginRight: 4 }} />
          View
        </Button>
      ),
    },
  ];

  return (
    <Layout>
      {/* Top Header with Right-Corner Filters */}
      <SectionHeader
        title="Production Engineering Dashboard"
        description="Real-time multi-module inspection pipeline and quality metrics"
        actions={
          <HStack gap={2} wrap="wrap" justify={{ base: 'flex-start', md: 'flex-end' }} align="center">
            {/* Part Name Filter */}
            <Box w={{ base: 'full', sm: '190px' }}>
              <Select
                id="dash-part-filter"
                size="xs"
                placeholder="All Parts"
                value={selectedPart}
                onChange={(val) => setSelectedPart(val)}
                options={[
                  { value: 'ALL', label: `All Parts (${partNames.length})` },
                  ...partNames.map((name) => ({ value: name, label: name })),
                ]}
                isSearchable={true}
              />
            </Box>

            {/* Chakra UI Native Range DatePicker */}
            <Box w={{ base: 'full', sm: 'auto' }}>
              <ChakraDateRangePicker
                startDate={fromDate}
                endDate={toDate}
                onRangeChange={(start, end) => {
                  setFromDate(start);
                  setToDate(end);
                }}
                size="xs"
                maxWidth="19rem"
                placeholderStart="From date"
                placeholderEnd="To date"
              />
            </Box>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                size="xs"
                variant="outline"
                colorPalette="red"
                onClick={handleResetFilters}
                title="Reset Filters"
                px={2}
              >
                <RotateCcw size={12} style={{ marginRight: 4 }} />
                Reset
              </Button>
            )}

            {/* Refresh */}
            <Button
              size="xs"
              variant="outline"
              onClick={() => loadDashboard()}
              loading={isLoading}
              title="Refresh Dashboard"
              px={2.5}
            >
              <RefreshCw size={13} style={{ marginRight: 4 }} />
              Refresh
            </Button>

            {/* Create Request */}
            <Button
              size="xs"
              colorPalette="brand"
              onClick={() => setIsCreateOpen(true)}
              px={3}
            >
              <Plus size={14} style={{ marginRight: 4 }} />
              Create Request
            </Button>
          </HStack>
        }
      />

      {/* Active Filter Indicator Banner */}
      {hasActiveFilters && (
        <Flex
          align="center"
          justify="space-between"
          bg={filterBannerBg}
          px={3}
          py={1.5}
          borderRadius="md"
          mb={4}
          borderWidth="1px"
          borderColor={filterBannerBorder}
        >
          <HStack gap={2} fontSize="xs" wrap="wrap">
            <Badge colorPalette="blue" size="sm" variant="solid">
              FILTER ACTIVE
            </Badge>
            <Text fontWeight="600" color={filterTextColor}>
              {selectedPart !== 'ALL' ? `Part: ${selectedPart}` : 'All Parts'}
              {fromDate || toDate
                ? ` • Date Range: ${fromDate || 'Start'} to ${toDate || 'Present'}`
                : ''}
            </Text>
            <Text fontSize="2xs" color="gray.500">
              ({data?.kpi?.totalRequests ?? 0} matching batches found)
            </Text>
          </HStack>
          <Button
            size="2xs"
            variant="ghost"
            colorPalette="red"
            onClick={handleResetFilters}
          >
            Clear Filters &times;
          </Button>
        </Flex>
      )}

      {/* All KPI Cards Resized in a Single Row (8 Cards across desktop) */}
      <SimpleGrid columns={{ base: 2, sm: 4, lg: 8 }} gap={2.5} mb={6}>
        <KPICard
          compact
          title="Total Assigned"
          value={data?.kpi?.throughput?.totalAssignedQty ?? data?.kpi?.totalRequests ?? 0}
          icon={Layers}
          colorScheme="blue"
          subtext="Total Scheduled"
          onClick={() => navigate('/requests')}
        />
        <KPICard
          compact
          title="Done / Completed"
          value={data?.kpi?.throughput?.completedDoneQty ?? data?.kpi?.completed ?? 0}
          icon={CheckCircle2}
          colorScheme="green"
          subtext={`${data?.kpi?.throughput?.completionRatePercent ?? 0}% Done`}
          onClick={() => navigate('/requests?status=Completed')}
        />
        <KPICard
          compact
          title="Pending Balance"
          value={data?.kpi?.throughput?.pendingBalanceQty ?? data?.kpi?.pending ?? 0}
          icon={Clock}
          colorScheme="orange"
          subtext="Awaiting QC"
          onClick={() => navigate('/requests?status=Assigned')}
        />
        <KPICard
          compact
          title="HT Pass (OK)"
          value={data?.kpi?.heatTreatment?.passOkQty ?? 0}
          icon={Flame}
          colorScheme="green"
          badge="BHN ≥ 80"
          subtext={`${data?.kpi?.heatTreatment?.passRatePercent ?? 0}% Pass`}
        />
        <KPICard
          compact
          title="HT Fail (Rej)"
          value={data?.kpi?.heatTreatment?.failNotOkQty ?? 0}
          icon={AlertOctagon}
          colorScheme="red"
          badge="BHN < 80"
          subtext="Sub-Spec"
        />
        <KPICard
          compact
          title="Tensile Pass"
          value={data?.kpi?.tensile?.passOkQty ?? 0}
          icon={ShieldCheck}
          colorScheme="green"
          badge="YS/UTS OK"
          subtext={`${data?.kpi?.tensile?.passRatePercent ?? 0}% Pass`}
        />
        <KPICard
          compact
          title="Tensile Fail"
          value={data?.kpi?.tensile?.failNotOkQty ?? 0}
          icon={FileX}
          colorScheme="red"
          badge="Sub-Spec"
          subtext="Mechanical Rej"
        />
        <KPICard
          compact
          title="Quality Yield"
          value={`${data?.kpi?.overallQuality?.firstPassYieldPercent ?? 0}%`}
          icon={Activity}
          colorScheme={(data?.kpi?.overallQuality?.firstPassYieldPercent ?? 0) >= 80 ? 'green' : 'orange'}
          badge="Yield"
          subtext={`${data?.kpi?.overallQuality?.overallOk ?? 0} OK / ${data?.kpi?.overallQuality?.overallNotOk ?? 0} Rej`}
        />
      </SimpleGrid>

      {/* Charts Grid: Pipeline & Quality Distribution */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={6}>
        <StatusBarChart
          data={data?.requestsByStatus ?? []}
          title="Inspection Pipeline by Status"
        />
        <DistributionDonut
          data={data?.distribution ?? []}
          title="Metallurgical Quality Distribution"
        />
      </SimpleGrid>

      {/* Metallurgical Process Run Charts Section Header */}
      <Box mb={3}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
          <Box>
            <Heading size="sm" color={sectionHeadingColor} fontWeight="700" textTransform="uppercase" letterSpacing="wide">
              Metallurgical Process Control Run Charts (LSL)
            </Heading>
            <Text fontSize="xs" color="gray.500" mt={0.5}>
              Sequential batch trend analysis with Lower Specification Limits (LSL). Filter each chart individually by part number.
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* 4 Individual Run Charts in 2x2 Grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} mb={6}>
        {/* 1. Hardness (≥ 80.00 BHN) */}
        <RunChartCard
          title="Hardness Run Chart (BHN)"
          parameterKey="bhn"
          threshold={80.0}
          unit="BHN"
          specLabel="≥ 80.00 BHN"
          data={data?.runChartData ?? []}
          colorTheme="green"
          icon={Flame}
        />

        {/* 2. Yield Strength (≥ 220 MPa) */}
        <RunChartCard
          title="Yield Strength (YS) Run Chart"
          parameterKey="ys"
          threshold={220.0}
          unit="MPa"
          specLabel="≥ 220.00 MPa"
          data={data?.runChartData ?? []}
          colorTheme="blue"
          icon={ShieldCheck}
        />

        {/* 3. Ultimate Tensile Strength (≥ 280 MPa) */}
        <RunChartCard
          title="Tensile Strength (UTS) Run Chart"
          parameterKey="uts"
          threshold={280.0}
          unit="MPa"
          specLabel="≥ 280.00 MPa"
          data={data?.runChartData ?? []}
          colorTheme="purple"
          icon={TrendingUp}
        />

        {/* 4. Elongation (≥ 1.00 %) */}
        <RunChartCard
          title="Elongation (E %) Run Chart"
          parameterKey="elongation"
          threshold={1.0}
          unit="%"
          specLabel="≥ 1.00 %"
          data={data?.runChartData ?? []}
          colorTheme="amber"
          icon={Activity}
        />
      </SimpleGrid>

      {/* Last 5 Completed Requests Table */}
      <Box mb={6}>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="sm" color={sectionHeadingColor} fontWeight="700" textTransform="uppercase" letterSpacing="wide">
            Recent Completed Inspection Reports
          </Heading>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="brand"
            onClick={() => navigate('/requests?status=Completed')}
          >
            View All Requests &rarr;
          </Button>
        </Flex>

        <DataTable
          columns={completedColumns}
          data={data?.last5Completed ?? []}
          isLoading={isLoading}
          emptyMessage="No completed inspection reports recorded for the selected filter."
          pageSize={5}
          onRowClick={(row) => navigate(`/requests/${row.requestId}`)}
        />
      </Box>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadDashboard}
      />
    </Layout>
  );
};
