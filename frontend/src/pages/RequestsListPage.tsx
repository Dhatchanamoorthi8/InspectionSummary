import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  HStack,
  VStack,
  Input,
  SimpleGrid,
  IconButton,
  Badge,
} from '@chakra-ui/react';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Eye,
  UserCheck,
  XCircle,
  PlayCircle,
  ClipboardList,
  Trash2,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import { StatusBadge } from '../components/StatusBadge';
import { ReassignInspectorModal } from '../components/ReassignInspectorModal';
import { CreateRequestModal } from './CreateRequestModal';
import {
  DataTable,
  Column,
  ConfirmationDialog,
  Select,
  Tooltip,
  Tabs,
  TabList,
  Tab,
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  Field,
  useToast,
  useColorModeValue,
} from '../components/ui';
import { requestsApi, partsApi, usersApi } from '../services/api';
import { InspectionRequest, User } from '../types';
import { useAuth } from '../context/AuthContext';

interface RequestsListPageProps {
  isInspectorView?: boolean;
}

export const RequestsListPage: React.FC<RequestsListPageProps> = ({
  isInspectorView = false,
}) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [requests, setRequests] = useState<InspectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [partNameFilter, setPartNameFilter] = useState(searchParams.get('partName') || '');
  const [inspectorFilter, setInspectorFilter] = useState(searchParams.get('inspector') || '');
  const [reportResultFilter, setReportResultFilter] = useState(searchParams.get('result') || '');
  const [hardnessStatusFilter, setHardnessStatusFilter] = useState(searchParams.get('hardnessStatus') || '');
  const [mechanicalStatusFilter, setMechanicalStatusFilter] = useState(searchParams.get('mechanicalStatus') || '');
  const [shiftFilter, setShiftFilter] = useState(searchParams.get('shift') || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Master lists for filters
  const [partNames, setPartNames] = useState<string[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('create') === 'true');
  const [reassignTarget, setReassignTarget] = useState<InspectionRequest | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<InspectionRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InspectionRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPE = user?.role === 'PRODUCTION_ENGINEER';

  // Theme-aware tokens
  const filterBg = useColorModeValue('white', 'gray.800');
  const filterBorder = useColorModeValue('industrial.200', 'gray.700');
  const searchBg = useColorModeValue('white', 'gray.900');
  const searchBorder = useColorModeValue('industrial.300', 'gray.600');
  const searchTextColor = useColorModeValue('industrial.900', 'gray.100');
  const filterLabelColor = useColorModeValue('industrial.700', 'gray.300');
  const searchHoverBorder = useColorModeValue('industrial.400', 'gray.500');
  const tabInactiveBg = useColorModeValue('white', 'gray.850');
  const tabInactiveColor = useColorModeValue('industrial.700', 'gray.300');
  const tabBorderColor = useColorModeValue('industrial.200', 'gray.700');
  const tabHoverBg = useColorModeValue('industrial.100', 'gray.750');
  const tabHoverText = useColorModeValue('industrial.950', 'white');
  const monoColor = useColorModeValue('gray.600', 'gray.300');

  useEffect(() => {
    loadFilterMetadata();
  }, []);

  // Sync state with URL search params (e.g. from Dashboard KPI clicks)
  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '');
    setPartNameFilter(searchParams.get('partName') || '');
    setInspectorFilter(searchParams.get('inspector') || '');
    setReportResultFilter(searchParams.get('result') || '');
    setHardnessStatusFilter(searchParams.get('hardnessStatus') || '');
    setMechanicalStatusFilter(searchParams.get('mechanicalStatus') || '');
    setShiftFilter(searchParams.get('shift') || '');
    if (searchParams.get('create') === 'true') {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadRequests();
  }, [
    statusFilter,
    partNameFilter,
    inspectorFilter,
    reportResultFilter,
    hardnessStatusFilter,
    mechanicalStatusFilter,
    shiftFilter,
  ]);

  const statusTabs = isInspectorView
    ? ['', 'Assigned', 'In Progress', 'Completed']
    : ['', 'Draft', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

  const tabLabels = isInspectorView
    ? ['All Tasks', 'Assigned', 'In Progress', 'Completed']
    : ['All Requests', 'Draft', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

  const activeTabIndex = Math.max(0, statusTabs.indexOf(statusFilter));

  const handleTabChange = (index: number) => {
    const newStatus = statusTabs[index];
    setStatusFilter(newStatus);
    const next = new URLSearchParams(searchParams);
    if (newStatus) {
      next.set('status', newStatus);
    } else {
      next.delete('status');
    }
    setSearchParams(next, { replace: true });
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    if (searchParams.get('create') === 'true') {
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  };

  const updateQueryParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const loadFilterMetadata = async () => {
    try {
      const [names, inspList] = await Promise.all([
        partsApi.getPartNames(),
        usersApi.getInspectors(),
      ]);
      setPartNames(names);
      setInspectors(inspList);
    } catch {
      // Non-critical if filter list fails
    }
  };

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (partNameFilter) filters.partName = partNameFilter;
      if (inspectorFilter) filters.inspectorId = inspectorFilter;
      if (reportResultFilter) filters.reportResult = reportResultFilter;
      if (hardnessStatusFilter) filters.hardnessStatus = hardnessStatusFilter;
      if (mechanicalStatusFilter) filters.mechanicalStatus = mechanicalStatusFilter;
      if (shiftFilter) filters.shift = shiftFilter;

      const data = await requestsApi.getRequests(filters);
      setRequests(data);
    } catch (err: any) {
      toast({
        title: 'Failed to load requests',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTask = async (id: string) => {
    try {
      await requestsApi.startInspection(id);
      toast({
        title: 'Inspection started',
        description: 'Task status updated to In Progress.',
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

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await requestsApi.cancelRequest(cancelTarget.id);
      toast({
        title: 'Request cancelled',
        description: `Request ${cancelTarget.requestNumber} has been cancelled.`,
        status: 'info',
        duration: 3000,
      });
      setCancelTarget(null);
      loadRequests();
    } catch (err: any) {
      toast({
        title: 'Cancel failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await requestsApi.deleteRequest(deleteTarget.id);
      toast({
        title: 'Request deleted',
        description: `Inspection request ${deleteTarget.requestNumber} has been permanently deleted.`,
        status: 'success',
        duration: 3000,
      });
      setDeleteTarget(null);
      loadRequests();
    } catch (err: any) {
      toast({
        title: 'Deletion failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter client-side by text search
  const filteredRequests = requests.filter((req) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      req.requestNumber.toLowerCase().includes(term) ||
      req.partName.toLowerCase().includes(term) ||
      req.partNumber.toLowerCase().includes(term) ||
      (req.shift && req.shift.toLowerCase().includes(term)) ||
      (req.assignedInspectorName && req.assignedInspectorName.toLowerCase().includes(term))
    );
  });

  const columns: Column<InspectionRequest>[] = [
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
      header: 'Shift',
      accessor: 'shift',
      render: (row) => {
        const s = row.shift || 'Shift 1';
        const colorPalette =
          s === 'Shift 1' ? 'blue' :
          s === 'Shift 2' ? 'orange' :
          s === 'Shift 3' ? 'purple' : 'teal';
        return (
          <Badge colorPalette={colorPalette} size="sm" variant="subtle" fontWeight="700">
            {s}
          </Badge>
        );
      },
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
        <Text fontFamily="mono" color={monoColor}>
          {row.partNumber}
        </Text>
      ),
    },
    {
      header: 'Assigned Inspector',
      accessor: 'assignedInspectorName',
      render: (row) => row.assignedInspectorName || <Text color="gray.400">—</Text>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Report QC',
      render: (row) => {
        if (!row.report) return <Text color="gray.400">—</Text>;
        return <StatusBadge status={row.report.overallStatus} />;
      },
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <HStack gap={1} justify="flex-end">
          {/* Quick primary actions based on role & state */}
          {isPE && (
            <Button
              size="xs"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/requests/${row.id}`);
              }}
            >
              <Eye size={12} style={{ marginRight: 4 }} />
              Detail
            </Button>
          )}

          {!isPE && row.status === 'Assigned' && (
            <Button
              size="xs"
              colorPalette="orange"
              onClick={(e) => {
                e.stopPropagation();
                handleStartTask(row.id);
              }}
            >
              <PlayCircle size={12} style={{ marginRight: 4 }} />
              Start
            </Button>
          )}

          {!isPE && row.status === 'In Progress' && (
            <Button
              size="xs"
              colorPalette="brand"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tasks/${row.id}/inspect`);
              }}
            >
              <ClipboardList size={12} style={{ marginRight: 4 }} />
              Inspect
            </Button>
          )}

          {row.status === 'Completed' && (
            <Button
              size="xs"
              colorPalette="green"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(isPE ? `/requests/${row.id}` : `/tasks/${row.id}/inspect`);
              }}
            >
              <Eye size={12} style={{ marginRight: 4 }} />
              Report
            </Button>
          )}

          {/* More actions menu for PE */}
          {isPE && (
            <MenuRoot positioning={{ placement: 'bottom-end' }}>
              <Tooltip label="Request actions" fontSize="xs">
                <MenuTrigger asChild>
                  <IconButton
                    aria-label="Request actions"
                    size="xs"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical size={14} />
                  </IconButton>
                </MenuTrigger>
              </Tooltip>
              <MenuContent minW="180px">
                <MenuItem
                  value="details"
                  onClick={() => navigate(`/requests/${row.id}`)}
                  cursor="pointer"
                >
                  <Eye size={14} style={{ marginRight: 8 }} />
                  View Details & Audit
                </MenuItem>
                {row.status !== 'Completed' && row.status !== 'Cancelled' && (
                  <MenuItem
                    value="reassign"
                    onClick={() => {
                      setReassignTarget(row);
                    }}
                    cursor="pointer"
                  >
                    <UserCheck size={14} style={{ marginRight: 8 }} />
                    Reassign Inspector
                  </MenuItem>
                )}
                {row.status !== 'Completed' && row.status !== 'Cancelled' && (
                  <MenuItem
                    value="cancel"
                    color="red.600"
                    onClick={() => setCancelTarget(row)}
                    cursor="pointer"
                  >
                    <XCircle size={14} style={{ marginRight: 8 }} />
                    Cancel Request
                  </MenuItem>
                )}
                <MenuItem
                  value="delete"
                  color="red.600"
                  onClick={() => setDeleteTarget(row)}
                  cursor="pointer"
                >
                  <Trash2 size={14} style={{ marginRight: 8 }} />
                  Delete Request
                </MenuItem>
              </MenuContent>
            </MenuRoot>
          )}
        </HStack>
      ),
    },
  ];

  return (
    <Layout>
      {/* Page Title & Actions */}
      <SectionHeader
        title={isInspectorView ? 'Assigned Inspection Tasks' : 'Inspection Requests'}
        description={
          isInspectorView
            ? 'Quality inspection tasks assigned to you for hardness & tensile evaluation'
            : 'Manage, assign, filter, and track heat treatment inspection requests'
        }
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={loadRequests}
              loading={isLoading}
            >
              <RefreshCw size={15} style={{ marginRight: 6 }} />
              Refresh
            </Button>
            {isPE && (
              <Button
                size="sm"
                colorPalette="brand"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus size={16} style={{ marginRight: 6 }} />
                Create Request
              </Button>
            )}
          </HStack>
        }
      />

      {/* Lifecycle Status Tabs */}
      <Box mb={4} overflowX="auto" pb={1}>
        <Tabs
          value={String(activeTabIndex)}
          onValueChange={(e: any) => handleTabChange(Number(e.value))}
          size="sm"
          variant="plain"
        >
          <TabList gap={2} border="none">
            {tabLabels.map((label, idx) => {
              const isActive = activeTabIndex === idx;
              return (
                <Tab
                  key={idx}
                  value={String(idx)}
                  fontWeight="700"
                  fontSize="xs"
                  whiteSpace="nowrap"
                  borderRadius="full"
                  px={4}
                  py={1.5}
                  h="32px"
                  cursor="pointer"
                  transition="background-color 140ms ease-out, border-color 140ms ease-out, color 140ms ease-out, box-shadow 140ms ease-out, transform 120ms cubic-bezier(0.23, 1, 0.32, 1)"
                  _active={{ transform: 'scale(0.96)' }}
                  bg={isActive ? '#2563EB' : tabInactiveBg}
                  color={isActive ? '#FFFFFF' : tabInactiveColor}
                  boxShadow={isActive ? '0 2px 4px rgba(37, 99, 235, 0.35)' : 'none'}
                  border="1px solid"
                  borderColor={isActive ? '#2563EB' : tabBorderColor}
                  _hover={{
                    bg: isActive ? '#1D4ED8' : tabHoverBg,
                    borderColor: isActive ? '#1D4ED8' : tabBorderColor,
                    color: isActive ? '#FFFFFF' : tabHoverText,
                  }}
                  _selected={{
                    bg: '#2563EB !important',
                    color: '#FFFFFF !important',
                    borderColor: '#2563EB !important',
                  }}
                >
                  {label}
                </Tab>
              );
            })}
          </TabList>
        </Tabs>
      </Box>

      {/* Filter Toolbar */}
      <Box
        p={4}
        bg={filterBg}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={filterBorder}
        boxShadow="sm"
        mb={5}
      >
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: isPE ? 6 : 5 }} gap={3} alignItems="flex-start">
          {/* Search */}
          <Field.Root id="filter-search" w="full">
            <Field.Label fontSize="xs" fontWeight="700" color={filterLabelColor} mb={1.5}>
              SEARCH
            </Field.Label>
            <Box position="relative" w="full">
              <Input
                id="filter-search"
                size="sm"
                h="32px"
                fontSize="xs"
                pl={8}
                placeholder="Search Req #, Part..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg={searchBg}
                border="1px solid"
                borderColor={searchBorder}
                color={searchTextColor}
                borderRadius="md"
                aria-label="Search requests by number or part"
                _hover={{
                  borderColor: searchHoverBorder,
                }}
                _focus={{
                  borderColor: 'brand.500',
                  boxShadow: '0 0 0 1px #2563EB',
                }}
                _focusVisible={{
                  outline: 'none',
                  borderColor: 'brand.500',
                  boxShadow: '0 0 0 1px #2563EB',
                }}
              />
              <Flex
                position="absolute"
                left={2.5}
                top="50%"
                transform="translateY(-50%)"
                pointerEvents="none"
              >
                <Search size={14} color="#94A3B8" />
              </Flex>
            </Box>
          </Field.Root>

          {/* Status Filter */}
          <Select
            id="filter-status"
            label="LIFECYCLE STATUS"
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              updateQueryParam('status', val);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Assigned', label: 'Assigned' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />

          {/* Part Name Filter */}
          <Select
            id="filter-part"
            label="PART NAME"
            value={partNameFilter}
            onChange={(val) => {
              setPartNameFilter(val);
              updateQueryParam('partName', val);
            }}
            options={[
              { value: '', label: 'All Parts' },
              ...partNames.map((name) => ({ value: name, label: name })),
            ]}
            isSearchable={true}
          />

          {/* Inspector Filter (PE only) */}
          {isPE && (
            <Select
              id="filter-inspector"
              label="ASSIGNED INSPECTOR"
              value={inspectorFilter}
              onChange={(val) => {
                setInspectorFilter(val);
                updateQueryParam('inspector', val);
              }}
              options={[
                { value: '', label: 'All Inspectors' },
                ...inspectors.map((insp) => ({ value: insp.id, label: insp.fullName })),
              ]}
              isSearchable={true}
            />
          )}

          {/* Shift Filter */}
          <Select
            id="filter-shift"
            label="PRODUCTION SHIFT"
            value={shiftFilter}
            onChange={(val) => {
              setShiftFilter(val);
              updateQueryParam('shift', val);
            }}
            options={[
              { value: '', label: 'All Shifts' },
              { value: 'Shift 1', label: 'Shift 1 (Morning)' },
              { value: 'Shift 2', label: 'Shift 2 (Evening)' },
              { value: 'Shift 3', label: 'Shift 3 (Night)' },
              { value: 'General Shift', label: 'General Shift' },
            ]}
          />

          {/* QC Result Filter */}
          <Select
            id="filter-result"
            label="REPORT RESULT"
            value={reportResultFilter}
            onChange={(val) => {
              setReportResultFilter(val);
              updateQueryParam('result', val);
            }}
            options={[
              { value: '', label: 'All Results' },
              { value: 'OK', label: 'OK (Passed)' },
              { value: 'NOT_OK', label: 'NOT OK (Failed)' },
            ]}
          />
        </SimpleGrid>
      </Box>

      {/* Active Filter Indicator Bar */}
      {(statusFilter || partNameFilter || inspectorFilter || reportResultFilter || hardnessStatusFilter || mechanicalStatusFilter || shiftFilter || searchTerm) && (
        <Flex
          justify="space-between"
          align="center"
          bg={useColorModeValue('blue.50', 'rgba(37, 99, 235, 0.15)')}
          px={3.5}
          py={2}
          borderRadius="md"
          mb={4}
          border="1px solid"
          borderColor={useColorModeValue('blue.200', 'blue.800')}
          wrap="wrap"
          gap={2}
        >
          <HStack gap={2} wrap="wrap">
            <Badge colorPalette="blue" size="sm" variant="solid" fontWeight="700">
              FILTER ACTIVE
            </Badge>
            {statusFilter && (
              <Badge colorPalette="gray" size="sm" variant="subtle">
                Status: {statusFilter}
              </Badge>
            )}
            {reportResultFilter && (
              <Badge colorPalette={reportResultFilter === 'OK' ? 'green' : 'red'} size="sm" variant="subtle">
                Result: {reportResultFilter}
              </Badge>
            )}
            {hardnessStatusFilter && (
              <Badge colorPalette={hardnessStatusFilter === 'OK' ? 'green' : 'red'} size="sm" variant="subtle">
                Hardness (BHN): {hardnessStatusFilter === 'OK' ? 'BHN ≥ 80 OK' : 'BHN < 80 Sub-Spec'}
              </Badge>
            )}
            {mechanicalStatusFilter && (
              <Badge colorPalette={mechanicalStatusFilter === 'OK' ? 'green' : 'red'} size="sm" variant="subtle">
                Tensile Mechanical: {mechanicalStatusFilter === 'OK' ? 'YS/UTS/%E OK' : 'Sub-Spec (Rej)'}
              </Badge>
            )}
            {partNameFilter && (
              <Badge colorPalette="gray" size="sm" variant="subtle">
                Part: {partNameFilter}
              </Badge>
            )}
            {shiftFilter && (
              <Badge colorPalette="orange" size="sm" variant="subtle">
                Shift: {shiftFilter}
              </Badge>
            )}
            {searchTerm && (
              <Badge colorPalette="gray" size="sm" variant="subtle">
                Search: "{searchTerm}"
              </Badge>
            )}
            <Text fontSize="2xs" color="gray.500" fontWeight="600">
              ({filteredRequests.length} matching {isInspectorView ? 'tasks' : 'requests'})
            </Text>
          </HStack>
          <Button
            size="2xs"
            variant="ghost"
            colorPalette="red"
            fontWeight="700"
            onClick={() => {
              setStatusFilter('');
              setPartNameFilter('');
              setInspectorFilter('');
              setReportResultFilter('');
              setHardnessStatusFilter('');
              setMechanicalStatusFilter('');
              setShiftFilter('');
              setSearchTerm('');
              setSearchParams(new URLSearchParams(), { replace: true });
            }}
          >
            Clear Filters ×
          </Button>
        </Flex>
      )}

      {/* Requests Data Table */}
      <DataTable
        columns={columns}
        data={filteredRequests}
        isLoading={isLoading}
        emptyMessage="No inspection requests matching your filter criteria."
        pageSize={10}
        onRowClick={(row) => {
          if (isPE) {
            navigate(`/requests/${row.id}`);
          } else if (row.status === 'Assigned') {
            handleStartTask(row.id);
          } else {
            navigate(`/tasks/${row.id}/inspect`);
          }
        }}
      />

      {/* Create Request Modal */}
      {isPE && (
        <CreateRequestModal
          isOpen={isCreateOpen}
          onClose={handleCloseCreate}
          onSuccess={() => {
            loadRequests();
            handleCloseCreate();
          }}
        />
      )}

      {/* Reassign Inspector Modal */}
      <ReassignInspectorModal
        isOpen={!!reassignTarget}
        onClose={() => setReassignTarget(null)}
        requestNumber={reassignTarget?.requestNumber}
        partName={reassignTarget?.partName}
        currentInspectorName={reassignTarget?.assignedInspectorName}
        inspectors={inspectors}
        isLoading={isReassigning}
        onConfirm={async (newInspectorId, reason) => {
          if (!reassignTarget) return;
          setIsReassigning(true);
          try {
            await requestsApi.reassignInspector(reassignTarget.id, {
              newInspectorId,
              reason,
            });
            toast({
              title: 'Inspector reassigned',
              description: `Request ${reassignTarget.requestNumber} reassigned successfully.`,
              status: 'success',
              duration: 3000,
            });
            setReassignTarget(null);
            loadRequests();
          } catch (err: any) {
            toast({
              title: 'Reassignment failed',
              description: err.response?.data?.message || err.message,
              status: 'error',
              duration: 4000,
            });
          } finally {
            setIsReassigning(false);
          }
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Inspection Request"
        description={`Are you sure you want to cancel request ${cancelTarget?.requestNumber}? This action is audited and irreversible.`}
        confirmLabel="Cancel Request"
        isDestructive
        isLoading={isCancelling}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Inspection Request"
        description={`Are you sure you want to permanently delete inspection request ${deleteTarget?.requestNumber}? This action cannot be undone.`}
        confirmLabel="Delete Request"
        isDestructive
        isLoading={isDeleting}
      />
    </Layout>
  );
};
