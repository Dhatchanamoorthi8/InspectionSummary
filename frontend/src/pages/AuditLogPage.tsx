import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  HStack,
  Input,
  Badge,
  SimpleGrid,
} from '@chakra-ui/react';
import { RefreshCw, History, Eye, Search } from 'lucide-react';
import { Layout } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import {
  DataTable,
  Column,
  Select,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogCloseTrigger,
  Field,
  useColorModeValue,
} from '../components/ui';
import { auditApi } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected log for diff inspection
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filterBg = useColorModeValue('white', 'gray.800');
  const filterBorder = useColorModeValue('industrial.200', 'gray.700');
  const searchBg = useColorModeValue('white', 'gray.900');
  const searchBorder = useColorModeValue('industrial.300', 'gray.600');
  const searchTextColor = useColorModeValue('industrial.900', 'gray.100');
  const filterLabelColor = useColorModeValue('gray.600', 'gray.400');
  const modalBg = useColorModeValue('white', 'gray.800');
  const modalBorder = useColorModeValue('industrial.200', 'gray.700');
  const headingColor = useColorModeValue('industrial.900', 'white');
  const timestampColor = useColorModeValue('gray.700', 'gray.300');

  useEffect(() => {
    loadLogs();
  }, [entityTypeFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditApi.getAuditLogs({ entityType: entityTypeFilter || undefined });
      setLogs(data);
    } catch {
      // Handled silently or empty state
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'green';
      case 'UPDATE':
      case 'ASSIGN':
      case 'REASSIGN':
        return 'blue';
      case 'STATUS_CHANGE':
        return 'purple';
      case 'SUBMIT':
        return 'teal';
      case 'APPROVE':
        return 'cyan';
      case 'REVISE':
        return 'yellow';
      case 'DEACTIVATE':
      case 'DELETE':
        return 'red';
      default:
        return 'gray';
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const userMatch = log.username?.toLowerCase().includes(term) || log.userId?.toLowerCase().includes(term);
    const actionMatch = log.action.toLowerCase().includes(term);
    const entityMatch = log.entityType.toLowerCase().includes(term);
    const idMatch = log.entityId.toLowerCase().includes(term);
    return userMatch || actionMatch || entityMatch || idMatch;
  });

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      width: '180px',
      render: (row) => (
        <Text fontSize="xs" fontFamily="mono" color={timestampColor}>
          {new Date(row.timestamp).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </Text>
      ),
    },
    {
      header: 'User',
      accessor: 'userId',
      width: '180px',
      render: (row) => (
        <Box>
          <Text fontSize="xs" fontWeight="700">
            {row.username || 'System Event'}
          </Text>
          <Text fontSize="2xs" color="gray.500">
            {row.userId || 'N/A'}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      width: '130px',
      render: (row) => (
        <Badge
          colorPalette={getActionBadgeColor(row.action)}
          variant="subtle"
          fontSize="2xs"
          px={2}
          py={0.5}
          borderRadius="md"
        >
          {row.action}
        </Badge>
      ),
    },
    {
      header: 'Entity Domain',
      accessor: 'entityType',
      width: '120px',
      render: (row) => (
        <Badge variant="outline" fontSize="2xs">
          {row.entityType}
        </Badge>
      ),
    },
    {
      header: 'Entity Ref',
      accessor: 'entityId',
      render: (row) => (
        <Text fontSize="xs" fontFamily="mono" color="gray.500" truncate maxW="200px">
          {row.entityId}
        </Text>
      ),
    },
    {
      header: 'Changes',
      align: 'right',
      render: (row) => (
        <Button
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
        >
          <Eye size={12} style={{ marginRight: 6 }} />
          Inspect Diff
        </Button>
      ),
    },
  ];

  return (
    <Layout>
      {/* Header */}
      <SectionHeader
        title="Immutable Audit Trail Viewer"
        description="Cryptographically auditable mutation history of requests, reports, users, and parts"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={loadLogs}
            loading={isLoading}
          >
            <RefreshCw size={15} style={{ marginRight: 6 }} />
            Refresh Logs
          </Button>
        }
      />

      {/* Filter Bar */}
      <Box
        p={4}
        bg={filterBg}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={filterBorder}
        boxShadow="sm"
        mb={5}
      >
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={3} alignItems="flex-start">
          <Field.Root id="audit-filter-search" w="full">
            <Field.Label fontSize="xs" fontWeight="700" color={filterLabelColor} mb={1.5}>
              SEARCH BY USER, ACTION, OR ENTITY
            </Field.Label>
            <Box position="relative" w="full">
              <Input
                id="audit-filter-search"
                size="sm"
                h="32px"
                fontSize="xs"
                pl={8}
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg={searchBg}
                border="1px solid"
                borderColor={searchBorder}
                color={searchTextColor}
                borderRadius="md"
                aria-label="Search by user, action, or entity"
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

          <Select
            id="audit-filter-entity"
            label="ENTITY DOMAIN"
            value={entityTypeFilter}
            onChange={setEntityTypeFilter}
            options={[
              { value: '', label: 'All Entities' },
              { value: 'REQUEST', label: 'REQUEST' },
              { value: 'REPORT', label: 'REPORT' },
              { value: 'PART', label: 'PART' },
              { value: 'USER', label: 'USER' },
            ]}
          />
        </SimpleGrid>
      </Box>

      {/* Audit Log Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        isLoading={isLoading}
        emptyMessage="No audit log records found."
        pageSize={15}
        onRowClick={(row) => setSelectedLog(row)}
      />

      {/* Diff Inspection Modal */}
      <DialogRoot
        open={!!selectedLog}
        onOpenChange={(e) => {
          if (!e.open) setSelectedLog(null);
        }}
        size="lg"
        placement="center"
      >
        <DialogContent bg={modalBg} borderColor={modalBorder}>
          <DialogHeader borderBottomWidth="1px" borderColor={modalBorder}>
            <DialogTitle fontSize="md" fontWeight="800" color={headingColor}>
              Audit Diff: {selectedLog?.action} on {selectedLog?.entityType} ({selectedLog?.entityId})
            </DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody pb={6} pt={4}>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <Box>
                <Text fontSize="xs" fontWeight="700" color="red.600" mb={2}>
                  PREVIOUS STATE:
                </Text>
                <Box
                  p={3}
                  bg="gray.900"
                  color="gray.100"
                  borderRadius="md"
                  fontFamily="mono"
                  fontSize="2xs"
                  maxH="300px"
                  overflowY="auto"
                >
                  <pre>
                    {selectedLog?.previousValue
                      ? JSON.stringify(selectedLog.previousValue, null, 2)
                      : '// NULL (Creation Event)'}
                  </pre>
                </Box>
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="700" color="green.600" mb={2}>
                  NEW STATE:
                </Text>
                <Box
                  p={3}
                  bg="gray.900"
                  color="gray.100"
                  borderRadius="md"
                  fontFamily="mono"
                  fontSize="2xs"
                  maxH="300px"
                  overflowY="auto"
                >
                  <pre>
                    {selectedLog?.newValue
                      ? JSON.stringify(selectedLog.newValue, null, 2)
                      : '// NULL'}
                  </pre>
                </Box>
              </Box>
            </SimpleGrid>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </Layout>
  );
};
