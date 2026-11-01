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
  RefreshCw,
  Clock,
  PlayCircle,
  CheckCircle2,
  FileX,
  FileCheck,
  ArrowRight,
  ClipboardList,
  Flame,
  ShieldCheck,
  AlertOctagon,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import { KPICard } from '../components/KPICard';
import { StatusBarChart, DistributionDonut } from '../components/Charts';
import { DataTable, Column, useToast, useColorModeValue } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { dashboardApi, requestsApi } from '../services/api';
import { InspectorDashboardData, InspectionRequest } from '../types';

export const InspectorDashboardPage: React.FC = () => {
  const [data, setData] = useState<InspectorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const toast = useToast();

  const partNumberColor = useColorModeValue('gray.600', 'gray.300');
  const sectionHeadingColor = useColorModeValue('industrial.800', 'white');

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await dashboardApi.getInspectorDashboard();
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Failed to load inspector metrics',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleStartTask = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await requestsApi.startInspection(id);
      toast({
        title: 'Inspection started',
        description: 'Task is now In Progress. Proceeding to report entry.',
        status: 'info',
        duration: 2500,
      });
      navigate(`/tasks/${id}/inspect`);
    } catch (err: any) {
      toast({
        title: 'Action failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleInspectNext = () => {
    if (!data?.nextPendingTask) {
      toast({
        title: 'No pending tasks',
        description: 'You have no assigned tasks pending inspection.',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    const next = data.nextPendingTask;
    if (next.status === 'Assigned') {
      handleStartTask(next.id);
    } else {
      navigate(`/tasks/${next.id}/inspect`);
    }
  };

  const taskColumns: Column<InspectionRequest>[] = [
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
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Action',
      render: (row) => {
        if (row.status === 'Assigned') {
          return (
            <Button
              size="xs"
              colorPalette="orange"
              onClick={(e) => handleStartTask(row.id, e)}
            >
              <PlayCircle size={13} style={{ marginRight: 4 }} />
              Start Task
            </Button>
          );
        }
        if (row.status === 'In Progress') {
          return (
            <Button
              size="xs"
              colorPalette="brand"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tasks/${row.id}/inspect`);
              }}
            >
              <ClipboardList size={13} style={{ marginRight: 4 }} />
              Enter Report
            </Button>
          );
        }
        return (
          <Button
            size="xs"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tasks/${row.id}/inspect`);
            }}
          >
            View Report
          </Button>
        );
      },
    },
  ];

  return (
    <Layout>
      {/* Top Header */}
      <SectionHeader
        title="Quality Inspector Workspace"
        description="Assigned heat treatment inspection tasks, real-time testing, and reports"
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={loadDashboard}
              loading={isLoading}
            >
              <RefreshCw size={15} style={{ marginRight: 6 }} />
              Refresh
            </Button>
            <Button
              size="sm"
              colorPalette="orange"
              onClick={handleInspectNext}
              disabled={!data?.nextPendingTask}
            >
              Inspect Next Pending Task
              <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </Button>
          </HStack>
        }
      />

      {/* Assigned Workload & Throughput */}
      <Box mb={6}>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="xs" color={sectionHeadingColor} fontWeight="700" textTransform="uppercase" letterSpacing="wider">
            Assigned Workload & Inspection Throughput
          </Heading>
          <Text fontSize="xs" color="gray.500" fontWeight="600">
            {data?.kpi?.throughput?.completionRatePercent ?? 0}% Task Completion Rate
          </Text>
        </Flex>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4}>
          <KPICard
            title="Total Assigned"
            value={data?.kpi?.throughput?.totalAssignedQty ?? data?.kpi?.totalAssigned ?? 0}
            icon={ClipboardList}
            colorScheme="blue"
            subtext="Assigned Work Orders"
          />
          <KPICard
            title="Done / Completed"
            value={data?.kpi?.throughput?.completedDoneQty ?? data?.kpi?.completed ?? 0}
            icon={CheckCircle2}
            colorScheme="green"
            subtext={`${data?.kpi?.throughput?.completionRatePercent ?? 0}% Completed`}
          />
          <KPICard
            title="Pending (Not Started)"
            value={data?.kpi?.pending ?? 0}
            icon={Clock}
            colorScheme="orange"
            subtext="Ready for Inspection"
          />
          <KPICard
            title="In Progress (Active)"
            value={data?.kpi?.inProgress ?? 0}
            icon={PlayCircle}
            colorScheme="orange"
            subtext="Currently Under Test"
          />
        </SimpleGrid>
      </Box>

      {/* Inspector Metallurgical Quality Gates */}
      <Box mb={6}>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="xs" color={sectionHeadingColor} fontWeight="700" textTransform="uppercase" letterSpacing="wider">
            Metallurgical Quality Verification Gates
          </Heading>
          <Text fontSize="xs" color="gray.500" fontWeight="600">
            Hardness (BHN) & Tensile Mechanical Testing
          </Text>
        </Flex>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4}>
          <KPICard
            title="Heat Treatment Pass"
            value={data?.kpi?.heatTreatment?.passOkQty ?? 0}
            icon={Flame}
            colorScheme="green"
            subtext={`${data?.kpi?.heatTreatment?.passRatePercent ?? 0}% Pass (${data?.kpi?.heatTreatment?.testedQty ?? 0} Tested)`}
            badge="BHN ≥ 80 OK"
          />
          <KPICard
            title="Heat Treatment Fail"
            value={data?.kpi?.heatTreatment?.failNotOkQty ?? 0}
            icon={AlertOctagon}
            colorScheme="red"
            subtext="Hardness Sub-Spec"
            badge="BHN < 80"
          />
          <KPICard
            title="Tensile Qty Pass"
            value={data?.kpi?.tensile?.passOkQty ?? 0}
            icon={ShieldCheck}
            colorScheme="green"
            subtext={`${data?.kpi?.tensile?.passRatePercent ?? 0}% Pass (${data?.kpi?.tensile?.testedQty ?? 0} Tested)`}
            badge="YS/UTS/%E OK"
          />
          <KPICard
            title="Tensile Qty Fail"
            value={data?.kpi?.tensile?.failNotOkQty ?? 0}
            icon={FileX}
            colorScheme="red"
            subtext="Mechanical Sub-Spec"
            badge="SUB-SPEC"
          />
        </SimpleGrid>
      </Box>

      {/* Charts Grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={6}>
        <StatusBarChart
          data={data?.requestsByStatus ?? []}
          title="Assigned Task Pipeline"
        />
        <DistributionDonut
          data={data?.distribution ?? []}
          title="My Inspection Results Distribution"
        />
      </SimpleGrid>

      {/* Recent Assigned Tasks Table */}
      <Box mb={6}>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="sm" color={sectionHeadingColor} fontWeight="700" textTransform="uppercase" letterSpacing="wide">
            Recent Assigned Inspection Tasks
          </Heading>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="brand"
            onClick={() => navigate('/tasks')}
          >
            View All My Tasks &rarr;
          </Button>
        </Flex>

        <DataTable
          columns={taskColumns}
          data={data?.recentAssignedTasks ?? []}
          isLoading={isLoading}
          emptyMessage="No inspection tasks currently assigned to you."
          pageSize={5}
          onRowClick={(row) => {
            if (row.status === 'Assigned') {
              handleStartTask(row.id);
            } else {
              navigate(`/tasks/${row.id}/inspect`);
            }
          }}
        />
      </Box>
    </Layout>
  );
};
