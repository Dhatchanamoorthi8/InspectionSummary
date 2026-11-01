import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  HStack,
  Input,
  VStack,
  Badge,
  Icon,
} from '@chakra-ui/react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Collapse,
  Tooltip,
  useToast,
  useColorModeValue,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from '../components/ui';
import {
  Plus,
  Download,
  Upload,
  RefreshCw,
  Search,
  Layers,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  Boxes,
  ListTree,
  List,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import { Layout } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import { DataTable, Column, ConfirmationDialog } from '../components/ui';
import { FormField } from '../components/FormField';
import { partsApi } from '../services/api';
import { PartMaster } from '../types';

interface GroupedPart {
  partName: string;
  items: PartMaster[];
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
}

export const PartMasterPage: React.FC = () => {
  const [parts, setParts] = useState<PartMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // View Mode: 'grouped' (Collapsible by Part Name) or 'flat' (Flat List)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  // Deactivate Dialog
  const [deactivateTarget, setDeactivateTarget] = useState<PartMaster | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Permanent Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<PartMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Import
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ partName: string; partNumber: string }[]>([]);
  const [previewResult, setPreviewResult] = useState<{
    totalRows: number;
    validRows: { partName: string; partNumber: string }[];
    invalidRows: { row: number; partName: string; partNumber: string; error: string }[];
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

  const tabQuery = searchParams.get('tab');
  const importQuery = searchParams.get('import');
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(
    tabQuery === 'upload' || importQuery === 'true' ? 1 : 0
  );

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('industrial.200', 'gray.700');
  const groupHeaderBg = useColorModeValue('white', 'gray.800');
  const alertErrorBg = useColorModeValue('red.50', 'rgba(153, 27, 27, 0.2)');
  const alertErrorBorder = useColorModeValue('red.200', 'red.800');
  const alertErrorTitle = useColorModeValue('red.700', 'red.200');
  const alertErrorText = useColorModeValue('red.600', 'red.300');

  useEffect(() => {
    if (tabQuery === 'upload' || importQuery === 'true') {
      setSelectedTabIndex(1);
    }
  }, [tabQuery, importQuery]);

  const handleTabChange = (index: number) => {
    setSelectedTabIndex(index);
    const next = new URLSearchParams(searchParams);
    if (index === 1) {
      next.set('tab', 'upload');
    } else {
      next.delete('tab');
      next.delete('import');
    }
    setSearchParams(next, { replace: true });
  };

  const handleCloseImportModal = () => {
    setIsImportOpen(false);
    if (searchParams.get('import') === 'true') {
      const next = new URLSearchParams(searchParams);
      next.delete('import');
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  useEffect(() => {
    if (searchParams.get('import') === 'true') {
      setPreviewResult(null);
      setIsImportOpen(true);
    }
  }, [searchParams]);

  const loadParts = async () => {
    setIsLoading(true);
    try {
      const data = await partsApi.getParts();
      setParts(data);
    } catch (err: any) {
      toast({
        title: 'Error loading part master data',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Grouped Parts Calculation
  const filteredParts = useMemo(() => {
    if (!searchTerm.trim()) return parts;
    const term = searchTerm.toLowerCase();
    return parts.filter(
      (p) =>
        p.partName.toLowerCase().includes(term) ||
        p.partNumber.toLowerCase().includes(term)
    );
  }, [parts, searchTerm]);

  const groupedParts = useMemo(() => {
    const map = new Map<string, PartMaster[]>();
    for (const part of filteredParts) {
      if (!map.has(part.partName)) {
        map.set(part.partName, []);
      }
      map.get(part.partName)!.push(part);
    }

    const result: GroupedPart[] = [];
    map.forEach((items, partName) => {
      items.sort((a, b) => a.partNumber.localeCompare(b.partNumber));
      const activeCount = items.filter((i) => i.isActive).length;
      result.push({
        partName,
        items,
        totalCount: items.length,
        activeCount,
        inactiveCount: items.length - activeCount,
      });
    });

    result.sort((a, b) => a.partName.localeCompare(b.partName));
    return result;
  }, [filteredParts]);

  // Default expand all on first load
  useEffect(() => {
    if (parts.length > 0 && Object.keys(expandedGroups).length === 0) {
      const initial: Record<string, boolean> = {};
      parts.forEach((p) => {
        initial[p.partName] = true;
      });
      setExpandedGroups(initial);
    }
  }, [parts]);

  // Auto-expand all matching groups on search
  useEffect(() => {
    if (searchTerm.trim()) {
      const searchExp: Record<string, boolean> = {};
      groupedParts.forEach((g) => {
        searchExp[g.partName] = true;
      });
      setExpandedGroups((prev) => ({ ...prev, ...searchExp }));
    }
  }, [searchTerm, groupedParts]);

  const toggleGroup = (partName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [partName]: !prev[partName],
    }));
  };

  const handleExpandAll = () => {
    const allExp: Record<string, boolean> = {};
    groupedParts.forEach((g) => {
      allExp[g.partName] = true;
    });
    setExpandedGroups(allExp);
  };

  const handleCollapseAll = () => {
    setExpandedGroups({});
  };

  const handleAddPartNumberToGroup = (partName: string) => {
    setNewPartName(partName);
    setNewPartNumber('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim() || !newPartNumber.trim()) return;

    setIsCreating(true);
    try {
      await partsApi.createPart(newPartName.trim(), newPartNumber.trim());
      toast({
        title: 'Part created',
        description: `Successfully added ${newPartName} (${newPartNumber}).`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setIsCreateOpen(false);
      setNewPartName('');
      setNewPartNumber('');
      // Auto expand newly added part's group
      setExpandedGroups((prev) => ({ ...prev, [newPartName.trim()]: true }));
      loadParts();
    } catch (err: any) {
      toast({
        title: 'Creation failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await partsApi.deletePart(deactivateTarget.id, false);
      toast({
        title: 'Part deactivated',
        description: `${deactivateTarget.partName} (${deactivateTarget.partNumber}) deactivated.`,
        status: 'info',
        duration: 3000,
      });
      setDeactivateTarget(null);
      loadParts();
    } catch (err: any) {
      toast({
        title: 'Deactivation failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeletePermanent = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await partsApi.deletePart(deleteTarget.id, true);
      toast({
        title: 'Part deleted',
        description: `${deleteTarget.partName} (${deleteTarget.partNumber}) permanently deleted.`,
        status: 'success',
        duration: 3000,
      });
      setDeleteTarget(null);
      loadParts();
    } catch (err: any) {
      toast({
        title: 'Deletion failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleActivate = async (part: PartMaster) => {
    try {
      await partsApi.activatePart(part.id);
      toast({
        title: 'Part activated',
        description: `${part.partName} (${part.partNumber}) is now active.`,
        status: 'success',
        duration: 3000,
      });
      loadParts();
    } catch (err: any) {
      toast({
        title: 'Activation failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/parts/template', '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows: { partName: string; partNumber: string }[] = results.data.map(
          (r: any) => ({
            partName: r.partName || r['Part Name'] || r.part_name || '',
            partNumber: r.partNumber || r['Part Number'] || r.part_number || '',
          }),
        );

        setImportRows(rows);
        setIsPreviewing(true);
        try {
          const preview = await partsApi.previewImport(rows);
          setPreviewResult(preview);
        } catch (err: any) {
          toast({
            title: 'Preview error',
            description: err.response?.data?.message || err.message,
            status: 'error',
            duration: 4000,
          });
        } finally {
          setIsPreviewing(false);
        }
      },
      error: (error) => {
        toast({
          title: 'CSV parse error',
          description: error.message,
          status: 'error',
          duration: 3000,
        });
      },
    });
  };

  const handleCommitImport = async () => {
    if (!previewResult || previewResult.validRows.length === 0) return;

    setIsCommitting(true);
    try {
      const result = await partsApi.commitImport(previewResult.validRows);
      toast({
        title: 'Bulk import successful',
        description: `Imported ${result.importedCount} parts into Part Master.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      handleCloseImportModal();
      setPreviewResult(null);
      setImportRows([]);
      loadParts();
    } catch (err: any) {
      toast({
        title: 'Commit failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const columns: Column<PartMaster>[] = useMemo(
    () => [
      {
        header: 'Part Name',
        accessor: 'partName',
        render: (row) => (
          <HStack gap={2}>
            <Icon as={Boxes} boxSize={3.5} color="brand.500" />
            <Text fontWeight="700">{row.partName}</Text>
          </HStack>
        ),
      },
      {
        header: 'Part Number',
        accessor: 'partNumber',
        render: (row) => (
          <Badge
            fontFamily="mono"
            colorPalette="teal"
            variant="subtle"
            fontSize="xs"
            px={2}
            py={0.5}
            borderRadius="md"
          >
            {row.partNumber}
          </Badge>
        ),
      },
      {
        header: 'Status',
        accessor: 'isActive',
        render: (row) => (
          <Badge colorPalette={row.isActive ? 'green' : 'gray'}>
            {row.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
        ),
      },
      {
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <HStack gap={1} justify="flex-end">
            {row.isActive ? (
              <Button
                size="xs"
                variant="ghost"
                colorPalette="yellow"
                onClick={() => setDeactivateTarget(row)}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                size="xs"
                variant="ghost"
                colorPalette="green"
                
                onClick={() => handleActivate(row)}
              ><CheckCircle size={12} /> Activate</Button>
            )}
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              
              onClick={() => setDeleteTarget(row)}
            ><Trash2 size={12} /> Delete</Button>
          </HStack>
        ),
      },
    ],
    [],
  );

  return (
    <Layout>
      {/* Header */}
      <SectionHeader
        title="Part Master Data Management"
        description="1:N Part Name to Part Number mappings, bulk CSV import, and master records"
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              
              onClick={loadParts}
              loading={isLoading}
            ><RefreshCw size={14} /> Refresh</Button>
            <Button
              size="sm"
              variant="outline"
              
              onClick={handleDownloadTemplate}
            ><Download size={14} /> Download CSV Template</Button>
            <Button
              size="sm"
              colorPalette="blue"
              
              onClick={() => {
                setNewPartName('');
                setNewPartNumber('');
                setIsCreateOpen(true);
              }}
            ><Plus size={15} /> Add New Part</Button>
          </>
        }
      />

      {/* Tabbed Navigation: Part Catalog & Bulk Upload */}
      <Tabs
        index={selectedTabIndex}
        onChange={handleTabChange}
        variant="enclosed"
        colorPalette="blue"
        mb={6}
      >
        <TabList borderColor={borderColor} mb={4}>
          <Tab fontWeight="700" fontSize="sm">
            <HStack gap={2}>
              <Icon as={Layers} boxSize={4} />
              <Text>Part Catalog</Text>
              <Badge colorPalette="blue" borderRadius="full" px={2} fontSize="2xs">
                {parts.length}
              </Badge>
            </HStack>
          </Tab>
          <Tab fontWeight="700" fontSize="sm">
            <HStack gap={2}>
              <Icon as={Upload} boxSize={4} />
              <Text>Bulk Upload</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          {/* TAB 1: PART CATALOG */}
          <TabPanel p={0}>
            {/* Search Bar & View Mode Toolbar */}
            <Flex
              direction={{ base: 'column', md: 'row' }}
              justify="space-between"
              align={{ base: 'stretch', md: 'center' }}
              gap={3}
              mb={4}
            >
              {/* Search Box */}
              <Box
                flex={1}
                p={2.5}
                px={3}
                bg={cardBg}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                boxShadow="sm"
              >
                <HStack gap={3}>
                  <Icon as={Search} boxSize={4} color="gray.400" />
                  <Input
                    placeholder="Search by Part Name or Part Number..."
                    size="sm"
                    variant="subtle"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button size="xs" variant="ghost" onClick={() => setSearchTerm('')}>
                      Clear
                    </Button>
                  )}
                </HStack>
              </Box>

              {/* View Mode Switcher & Expand/Collapse All Buttons */}
              <HStack gap={2} justify={{ base: 'space-between', md: 'flex-end' }}>
                <HStack
                  gap={1}
                  bg={useColorModeValue('gray.100', 'gray.750')}
                  p={1}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <Button
                    size="xs"
                    variant={viewMode === 'grouped' ? 'solid' : 'ghost'}
                    colorPalette={viewMode === 'grouped' ? 'brand' : 'gray'}
                    
                    onClick={() => setViewMode('grouped')}
                    fontWeight="700"
                  ><ListTree size={13} /> Grouped (Collapsible)</Button>
                  <Button
                    size="xs"
                    variant={viewMode === 'flat' ? 'solid' : 'ghost'}
                    colorPalette={viewMode === 'flat' ? 'brand' : 'gray'}
                    
                    onClick={() => setViewMode('flat')}
                    fontWeight="700"
                  ><List size={13} /> Flat List</Button>
                </HStack>

                {viewMode === 'grouped' && (
                  <HStack gap={1}>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleExpandAll}
                      disabled={groupedParts.length === 0}
                    >
                      Expand All
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleCollapseAll}
                      disabled={groupedParts.length === 0}
                    >
                      Collapse All
                    </Button>
                  </HStack>
                )}
              </HStack>
            </Flex>

            {/* Quick Summary Pill */}
            <HStack gap={3} mb={4} px={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="600">
                Showing{' '}
                <Text as="span" fontWeight="800" color={useColorModeValue('brand.600', 'brand.300')}>
                  {groupedParts.length}
                </Text>{' '}
                Part Families (
                <Text as="span" fontWeight="700" color={useColorModeValue('gray.800', 'gray.200')}>
                  {filteredParts.length}
                </Text>{' '}
                total Part Numbers)
              </Text>
            </HStack>

            {/* VIEW MODE 1: GROUPED COLLAPSIBLE ACCORDION */}
            {viewMode === 'grouped' ? (
              <VStack gap={3} align="stretch">
                {groupedParts.length === 0 ? (
                  <Box
                    p={10}
                    textAlign="center"
                    bg={cardBg}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={borderColor}
                  >
                    <Icon as={Boxes} boxSize={8} color="gray.400" mb={2} />
                    <Text fontWeight="600" color="gray.500">
                      No part records matching "{searchTerm}"
                    </Text>
                  </Box>
                ) : (
                  groupedParts.map((group) => {
                    const isExpanded = !!expandedGroups[group.partName];
                    return (
                      <Box
                        key={group.partName}
                        bg={cardBg}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={isExpanded ? useColorModeValue('brand.300', 'brand.600') : borderColor}
                        boxShadow="sm"
                        overflow="hidden"
                        transition="border-color 160ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 160ms ease-out"
                      >
                        {/* Collapsible Header */}
                        <Flex
                          p={3.5}
                          align="center"
                          justify="space-between"
                          bg={
                            isExpanded
                              ? useColorModeValue('blue.50', 'rgba(49, 130, 206, 0.08)')
                              : groupHeaderBg
                          }
                          cursor="pointer"
                          onClick={() => toggleGroup(group.partName)}
                          userSelect="none"
                          _hover={{ bg: useColorModeValue('gray.50', 'gray.750') }}
                        >
                          <HStack gap={3} flex={1}>
                            <Box
                              transform={isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'}
                              transition="transform 180ms cubic-bezier(0.23, 1, 0.32, 1)"
                              color="brand.500"
                              display="flex"
                              alignItems="center"
                            >
                              <ChevronRight size={18} />
                            </Box>

                            <Box
                              p={1.5}
                              borderRadius="md"
                              bg={useColorModeValue('brand.50', 'rgba(49, 130, 206, 0.15)')}
                              color="brand.600"
                            >
                              <Icon as={Boxes} boxSize={4} />
                            </Box>

                            <VStack align="start" gap={0.5}>
                              <HStack gap={2} wrap="wrap">
                                <Text
                                  fontWeight="800"
                                  fontSize="md"
                                  color={useColorModeValue('gray.800', 'white')}
                                >
                                  {group.partName}
                                </Text>
                                <Badge
                                  colorPalette="blue"
                                  variant="subtle"
                                  borderRadius="full"
                                  px={2.5}
                                  py={0.5}
                                  fontSize="2xs"
                                  fontWeight="700"
                                >
                                  {group.totalCount} {group.totalCount === 1 ? 'Part Number' : 'Part Numbers'}
                                </Badge>
                                {group.inactiveCount > 0 ? (
                                  <Badge colorPalette="orange" variant="outline" fontSize="2xs">
                                    {group.inactiveCount} Inactive
                                  </Badge>
                                ) : (
                                  <Badge colorPalette="green" variant="subtle" fontSize="2xs">
                                    All Active
                                  </Badge>
                                )}
                              </HStack>
                              <Text fontSize="2xs" color="gray.500">
                                Click to {isExpanded ? 'collapse' : 'open and show all part numbers'}
                              </Text>
                            </VStack>
                          </HStack>

                          {/* Right Action: Add Part Number to this specific Part Name */}
                          <HStack gap={2} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="xs"
                              colorPalette="blue"
                              variant="outline"
                              
                              onClick={() => handleAddPartNumberToGroup(group.partName)}
                            ><Plus size={13} /> Add Part Number</Button>
                          </HStack>
                        </Flex>

                        {/* Collapsible Content */}
                        <Collapse in={isExpanded} animateOpacity>
                          <Box
                            p={3.5}
                            borderTopWidth="1px"
                            borderColor={borderColor}
                            bg={useColorModeValue('gray.50', 'gray.850')}
                          >
                            <TableContainer
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor={borderColor}
                              bg={cardBg}
                            >
                              <Table size="sm" variant="line">
                                <Thead bg={useColorModeValue('industrial.50', 'gray.750')}>
                                  <Tr>
                                    <Th width="50px" fontSize="2xs" color="gray.500">#</Th>
                                    <Th fontSize="2xs" color="gray.500">PART NUMBER</Th>
                                    <Th fontSize="2xs" color="gray.500">STATUS</Th>
                                    <Th fontSize="2xs" color="gray.500">ADDED ON</Th>
                                    <Th textAlign="right" fontSize="2xs" color="gray.500">ACTIONS</Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {group.items.map((item, idx) => (
                                    <Tr
                                      key={item.id}
                                      _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                                      transition="background-color 0.15s"
                                    >
                                      <Td fontSize="xs" color="gray.500" fontWeight="600">
                                        {idx + 1}
                                      </Td>
                                      <Td>
                                        <Badge
                                          fontFamily="mono"
                                          fontSize="xs"
                                          px={2.5}
                                          py={1}
                                          borderRadius="md"
                                          colorPalette="teal"
                                          variant="subtle"
                                          fontWeight="700"
                                        >
                                          {item.partNumber}
                                        </Badge>
                                      </Td>
                                      <Td>
                                        <Badge colorPalette={item.isActive ? 'green' : 'gray'}>
                                          {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </Badge>
                                      </Td>
                                      <Td fontSize="xs" color="gray.500">
                                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                                      </Td>
                                      <Td textAlign="right">
                                        <HStack gap={1} justify="flex-end">
                                          {item.isActive ? (
                                            <Button
                                              size="xs"
                                              variant="ghost"
                                              colorPalette="yellow"
                                              onClick={() => setDeactivateTarget(item)}
                                            >
                                              Deactivate
                                            </Button>
                                          ) : (
                                            <Button
                                              size="xs"
                                              variant="ghost"
                                              colorPalette="green"
                                              
                                              onClick={() => handleActivate(item)}
                                            ><CheckCircle size={12} /> Activate</Button>
                                          )}
                                          <Button
                                            size="xs"
                                            variant="ghost"
                                            colorPalette="red"
                                            
                                            onClick={() => setDeleteTarget(item)}
                                          ><Trash2 size={12} /> Delete</Button>
                                        </HStack>
                                      </Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            </TableContainer>
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })
                )}
              </VStack>
            ) : (
              /* VIEW MODE 2: FLAT LIST */
              <DataTable
                columns={columns}
                data={filteredParts}
                isLoading={isLoading}
                emptyMessage="No part records found."
                pageSize={10}
              />
            )}
          </TabPanel>

          {/* TAB 2: BULK UPLOAD */}
          <TabPanel p={0}>
            <Box
              p={{ base: 4, md: 6 }}
              bg={cardBg}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={borderColor}
              boxShadow="sm"
            >
              <VStack gap={5} align="stretch">
                <Box>
                  <Heading size="sm" fontWeight="800" mb={1}>
                    Bulk Import Part Master Data (CSV)
                  </Heading>
                  <Text fontSize="xs" color="gray.500">
                    Upload multiple Part Name and Part Number mappings in a single batch. All rows are validated before saving.
                  </Text>
                </Box>

                {/* Step 1: Download Template */}
                <HStack
                  p={4}
                  bg={useColorModeValue('industrial.50', 'gray.700')}
                  borderRadius="md"
                  justify="space-between"
                  wrap="wrap"
                  gap={3}
                >
                  <Box>
                    <Text fontSize="xs" fontWeight="700">
                      Step 1: Download Standard Template
                    </Text>
                    <Text fontSize="2xs" color="gray.500">
                      Contains required header columns: <Text as="span" fontFamily="mono">partName, partNumber</Text>
                    </Text>
                  </Box>
                  <Button
                    size="xs"
                    variant="outline"
                    
                    onClick={handleDownloadTemplate}
                  ><Download size={14} /> Download Template</Button>
                </HStack>

                {/* Step 2: File Selector / Dropzone */}
                <Box
                  borderWidth="2px"
                  borderStyle="dashed"
                  borderColor={useColorModeValue('industrial.300', 'gray.600')}
                  p={8}
                  borderRadius="lg"
                  textAlign="center"
                  bg={useColorModeValue('gray.50', 'gray.750')}
                  cursor="pointer"
                  onClick={() => fileInputRef.current?.click()}
                  _hover={{ borderColor: 'brand.500', bg: useColorModeValue('brand.50', 'gray.700') }}
                  transition="border-color 160ms ease-out, background-color 160ms ease-out, transform 120ms cubic-bezier(0.23, 1, 0.32, 1)"
                  _active={{ transform: 'scale(0.99)' }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <VStack gap={2}>
                    <Icon as={FileSpreadsheet} boxSize={8} color="brand.500" />
                    <Text fontSize="sm" fontWeight="700">
                      Click or drag CSV file here to upload
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Supported file format: .csv with UTF-8 encoding
                    </Text>
                  </VStack>
                </Box>

                {/* Step 3: Validation Preview */}
                {isPreviewing && (
                  <HStack justify="center" p={4}>
                    <RefreshCw className="animate-spin" size={16} />
                    <Text fontSize="xs">Validating CSV rows...</Text>
                  </HStack>
                )}

                {previewResult && (
                  <VStack gap={4} align="stretch" mt={2}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                      <HStack gap={3}>
                        <Badge colorPalette="green" px={2} py={0.5} borderRadius="md">
                          Valid: {previewResult.validRows.length}
                        </Badge>
                        {previewResult.invalidRows.length > 0 && (
                          <Badge colorPalette="red" px={2} py={0.5} borderRadius="md">
                            Errors: {previewResult.invalidRows.length}
                          </Badge>
                        )}
                        <Text fontSize="xs" color="gray.500">
                          Total Parsed: {previewResult.totalRows}
                        </Text>
                      </HStack>

                      <Button
                        size="sm"
                        colorPalette="blue"
                        disabled={previewResult.validRows.length === 0}
                        loading={isCommitting}
                        onClick={handleCommitImport}
                      >
                        Commit Valid Parts ({previewResult.validRows.length})
                      </Button>
                    </Flex>

                    {previewResult.invalidRows.length > 0 && (
                      <Box
                        p={3}
                        bg={alertErrorBg}
                        borderWidth="1px"
                        borderColor={alertErrorBorder}
                        borderRadius="md"
                      >
                        <HStack gap={2} mb={2} color={alertErrorTitle}>
                          <Icon as={AlertCircle} boxSize={4} />
                          <Text fontSize="xs" fontWeight="700">
                            Found {previewResult.invalidRows.length} validation errors:
                          </Text>
                        </HStack>
                        <VStack align="stretch" gap={1} pl={6}>
                          {previewResult.invalidRows.slice(0, 5).map((err, i) => (
                            <Text key={i} fontSize="2xs" color={alertErrorText}>
                              Row {err.row}: {err.error} (Part: {err.partName || 'Empty'}, No: {err.partNumber || 'Empty'})
                            </Text>
                          ))}
                          {previewResult.invalidRows.length > 5 && (
                            <Text fontSize="2xs" color={alertErrorText} fontStyle="italic">
                              ...and {previewResult.invalidRows.length - 5} more errors.
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                )}
              </VStack>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Add New Part Modal */}
      <DialogRoot
        open={isCreateOpen}
        onOpenChange={(e) => setIsCreateOpen(e.open)}
        placement="center"
      >
        <DialogContent
          as="form"
          onSubmit={handleCreateSubmit}
          bg={cardBg}
          borderRadius="lg"
          mx={4}
          borderWidth="1px"
          borderColor={borderColor}
          boxShadow="2xl"
        >
          <DialogHeader>
            <DialogTitle fontSize="md" fontWeight="800">
              {newPartName ? `Add Part Number to "${newPartName}"` : 'Create New Part Mapping'}
            </DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
            <VStack gap={4}>
              <FormField
                ref={initialFocusRef}
                id="part-name-input"
                label="PART NAME"
                isRequired
                placeholder="e.g. Turbine Blade or TM BKT"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
              />

              <FormField
                id="part-number-input"
                label="PART NUMBER"
                isRequired
                placeholder="e.g. TB-2001 or TM-BKT-002"
                value={newPartNumber}
                onChange={(e) => setNewPartNumber(e.target.value)}
                fontFamily="mono"
              />
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorPalette="blue"
              size="sm"
              loading={isCreating}
              disabled={!newPartName.trim() || !newPartNumber.trim()}
            >
              Add Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      {/* Deactivate Dialog */}
      <ConfirmationDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Part"
        message={`Are you sure you want to deactivate ${deactivateTarget?.partName} (${deactivateTarget?.partNumber})? It will no longer be selectable in new inspection requests.`}
        confirmLabel="Deactivate"
        confirmColorScheme="red"
        isLoading={isDeactivating}
      />

      {/* Permanent Delete Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePermanent}
        title="Permanently Delete Part Number"
        message={`Are you sure you want to permanently delete part number ${deleteTarget?.partNumber} under "${deleteTarget?.partName}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmColorScheme="red"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </Layout>
  );
};
