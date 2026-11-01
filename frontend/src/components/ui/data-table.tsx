import React, { useState } from 'react';
import {
  Box,
  Flex,
  Button,
  Text,
  HStack,
  VStack,
} from '@chakra-ui/react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from './table';
import { Skeleton } from './skeleton';
import { useColorModeValue } from './color-mode';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { Select } from './select';

export interface Column<T> {
  header: string;
  accessor?: keyof T | string;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
  pageSize: initialPageSize = 10,
  onRowClick,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const containerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('industrial.200', 'gray.700');
  const headerBg = useColorModeValue('industrial.50', 'gray.900');
  const thTextColor = useColorModeValue('industrial.700', 'gray.300');
  const cellTextColor = useColorModeValue('industrial.900', 'gray.100');
  const rowHoverBg = useColorModeValue('industrial.50', 'whiteAlpha.50');
  const footerBg = useColorModeValue('industrial.50', 'gray.850');
  const footerTextColor = useColorModeValue('gray.600', 'gray.400');
  const pageCounterColor = useColorModeValue('gray.700', 'gray.300');
  const pageBtnBg = useColorModeValue('white', 'gray.800');
  const pageBtnBorder = useColorModeValue('industrial.300', 'gray.600');

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIndex, startIndex + pageSize);

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      bg={containerBg}
      boxShadow="sm"
      overflow="hidden"
      transition="background-color 0.2s, border-color 0.2s"
    >
      {/* Desktop / Tablet Table View (>= 768px) */}
      <Box display={{ base: 'none', md: 'block' }}>
        <TableContainer overflowX="auto">
          <Table size="md">
            <Thead>
              <Tr bg={headerBg}>
                {columns.map((col, idx) => (
                  <Th
                    key={idx}
                    width={col.width}
                    textAlign={col.align || 'left'}
                    py={3.5}
                    borderColor={borderColor}
                    color={thTextColor}
                    bg={headerBg}
                  >
                    {col.header}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, rIdx) => (
                  <Tr key={rIdx}>
                    {columns.map((_, cIdx) => (
                      <Td key={cIdx} py={4} borderColor={borderColor}>
                        <Skeleton h="16px" borderRadius="sm" />
                      </Td>
                    ))}
                  </Tr>
                ))
              ) : currentData.length === 0 ? (
                <Tr>
                  <Td colSpan={columns.length} textAlign="center" py={6} borderColor={borderColor}>
                    <EmptyState
                      title={emptyMessage}
                      description="No records match your search or filter criteria."
                    />
                  </Td>
                </Tr>
              ) : (
                currentData.map((row, rowIdx) => (
                  <Tr
                    key={row.id ?? row.requestId ?? rowIdx}
                    _hover={{ bg: rowHoverBg, cursor: onRowClick ? 'pointer' : 'default' }}
                    onClick={() => onRowClick && onRowClick(row)}
                    transition="background-color 0.15s ease"
                  >
                    {columns.map((col, colIdx) => (
                      <Td
                        key={colIdx}
                        textAlign={col.align || 'left'}
                        py={3}
                        borderColor={borderColor}
                        color={cellTextColor}
                      >
                        {col.render
                          ? col.render(row, startIndex + rowIdx)
                          : (row as any)[col.accessor as string] ?? '—'}
                      </Td>
                    ))}
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {/* Mobile Card-Style Record View (< 768px) */}
      <Box display={{ base: 'block', md: 'none' }} p={3}>
        {isLoading ? (
          <VStack gap={3} align="stretch">
            {Array.from({ length: 3 }).map((_, i) => (
              <Box key={i} p={4} borderWidth="1px" borderColor={borderColor} borderRadius="md" bg={containerBg}>
                <Skeleton h="16px" w="60%" mb={2} />
                <Skeleton h="12px" w="90%" mb={1} />
                <Skeleton h="12px" w="40%" />
              </Box>
            ))}
          </VStack>
        ) : currentData.length === 0 ? (
          <EmptyState
            title={emptyMessage}
            description="No records match your search or filter criteria."
          />
        ) : (
          <VStack gap={3} align="stretch">
            {currentData.map((row, rowIdx) => (
              <Box
                key={row.id ?? row.requestId ?? rowIdx}
                p={3.5}
                bg={containerBg}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
                boxShadow="xs"
                onClick={() => onRowClick && onRowClick(row)}
                cursor={onRowClick ? 'pointer' : 'default'}
                _hover={onRowClick ? { bg: rowHoverBg } : undefined}
                transition="background-color 0.15s ease"
              >
                <VStack gap={2} align="stretch">
                  {columns.map((col, colIdx) => (
                    <Flex key={colIdx} justify="space-between" align="center" py={0.5}>
                      <Text
                        fontSize="2xs"
                        fontWeight="700"
                        color="gray.400"
                        textTransform="uppercase"
                        letterSpacing="wider"
                      >
                        {col.header}
                      </Text>
                      <Box fontSize="xs" fontWeight="600" textAlign="right" color={cellTextColor}>
                        {col.render
                          ? col.render(row, startIndex + rowIdx)
                          : (row as any)[col.accessor as string] ?? '—'}
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>

      {/* Pagination Footer */}
      {data.length > 0 && (
        <Flex
          justify="space-between"
          align="center"
          px={4}
          py={3}
          borderTop="1px solid"
          borderColor={borderColor}
          bg={footerBg}
          wrap="wrap"
          gap={3}
        >
          <HStack gap={2}>
            <Text fontSize="xs" color={footerTextColor}>
              Showing
            </Text>
            <Text fontSize="xs" fontWeight="700" color={pageCounterColor}>
              {data.length === 0 ? 0 : startIndex + 1} &ndash;{' '}
              {Math.min(startIndex + pageSize, data.length)}
            </Text>
            <Text fontSize="xs" color={footerTextColor}>
              of {data.length} entries
            </Text>
          </HStack>

          <HStack gap={3}>
            {/* Page Size Selector */}
            <HStack gap={1.5}>
              <Text fontSize="xs" color={footerTextColor}>
                Rows:
              </Text>
              <Box w="80px">
                <Select
                  size="xs"
                  value={String(pageSize)}
                  onChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                />
              </Box>
            </HStack>

            {/* Pagination Controls */}
            <HStack gap={1}>
              <Button
                size="xs"
                variant="outline"
                bg={pageBtnBg}
                borderColor={pageBtnBorder}
                onClick={handlePrev}
                disabled={currentPage <= 1 || isLoading}
                px={2}
              >
                <ChevronLeft size={14} />
                Prev
              </Button>
              <Text fontSize="xs" fontWeight="600" px={2} color={pageCounterColor}>
                {currentPage} / {totalPages}
              </Text>
              <Button
                size="xs"
                variant="outline"
                bg={pageBtnBg}
                borderColor={pageBtnBorder}
                onClick={handleNext}
                disabled={currentPage >= totalPages || isLoading}
                px={2}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </HStack>
          </HStack>
        </Flex>
      )}
    </Box>
  );
}

export default DataTable;
