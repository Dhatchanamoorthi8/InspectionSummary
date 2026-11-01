import React from 'react';
import {
  Box,
  SimpleGrid,
  Field,
  Input,
  Text,
  Badge,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { Card, CardBody } from '../../components/ui/card';
import { useColorModeValue } from '../../components/ui/color-mode';
import { Select } from '../../components/ui/select';
import { LineInspectionData, LineInspectionEvaluation } from './types';
import { CheckCircle2, AlertTriangle, Gauge, Ruler, Eye, Bug } from 'lucide-react';

interface LineInspectionFormProps {
  data: Partial<LineInspectionData>;
  onChange: (field: keyof LineInspectionData, value: any) => void;
  evaluation: LineInspectionEvaluation;
  isReadOnly?: boolean;
}

export const LineInspectionForm: React.FC<LineInspectionFormProps> = ({
  data,
  onChange,
  evaluation,
  isReadOnly = false,
}) => {
  const cardBg = useColorModeValue('white', 'gray.850');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const labelColor = useColorModeValue('gray.700', 'gray.300');
  const statBg = useColorModeValue('gray.50', 'gray.900');

  const shiftOptions = [
    { label: 'Shift A (Morning 06:00 - 14:00)', value: 'Shift-A' },
    { label: 'Shift B (Evening 14:00 - 22:00)', value: 'Shift-B' },
    { label: 'Shift C (Night 22:00 - 06:00)', value: 'Shift-C' },
  ];

  const visualOptions = [
    { label: 'PASS - No cracks, burrs, or surface defects', value: 'PASS' },
    { label: 'FAIL - Cracks, pittings, or abnormal tool marks', value: 'FAIL' },
  ];

  return (
    <VStack gap={6} align="stretch">
      {/* 1. Production Line Context */}
      <Card bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="lg" p={0}>
        <CardBody p={4}>
          <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wider" color="brand.500" mb={3}>
            Line & Station Context
          </Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <Field.Root required>
              <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                PRODUCTION LINE NO.
              </Field.Label>
              <Input
                value={data.lineId || ''}
                onChange={(e) => onChange('lineId', e.target.value)}
                placeholder="e.g. Line-01, Line-04"
                size="sm"
                readOnly={isReadOnly}
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                OPERATIONAL SHIFT
              </Field.Label>
              <Select
                options={shiftOptions}
                value={data.shift || 'Shift-A'}
                onChange={(val) => onChange('shift', val)}
                size="sm"
                disabled={isReadOnly}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                LINE SUPERVISOR
              </Field.Label>
              <Input
                value={data.supervisor || ''}
                onChange={(e) => onChange('supervisor', e.target.value)}
                placeholder="e.g. Robert Miller"
                size="sm"
                readOnly={isReadOnly}
              />
            </Field.Root>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* 2. Physical Inspection Parameters with Live Evaluation */}
      <Card bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="lg" p={0}>
        <CardBody p={4}>
          <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wider" color="brand.500" mb={3}>
            Inspection Measurements & Quality Verification
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
            {/* Visual Check */}
            <Box p={3} borderRadius="md" bg={statBg} borderWidth="1px" borderColor={cardBorder}>
              <HStack justify="space-between" mb={2}>
                <HStack gap={2}>
                  <Eye size={16} color="#3B82F6" />
                  <Text fontSize="xs" fontWeight="700" color={labelColor}>
                    SURFACE VISUAL CHECK
                  </Text>
                </HStack>
                <Badge colorPalette={evaluation.visualStatus === 'OK' ? 'green' : 'red'}>
                  {evaluation.visualStatus === 'OK' ? 'PASS' : 'FAIL'}
                </Badge>
              </HStack>
              <Select
                options={visualOptions}
                value={data.visualCheck || 'PASS'}
                onChange={(val) => onChange('visualCheck', val as any)}
                size="sm"
                disabled={isReadOnly}
              />
              <Text fontSize="2xs" color="gray.500" mt={1}>
                Criterion: Zero cracks, blowholes, or micro-burrs allowed.
              </Text>
            </Box>

            {/* Fastener Torque */}
            <Box p={3} borderRadius="md" bg={statBg} borderWidth="1px" borderColor={cardBorder}>
              <HStack justify="space-between" mb={2}>
                <HStack gap={2}>
                  <Gauge size={16} color="#F97316" />
                  <Text fontSize="xs" fontWeight="700" color={labelColor}>
                    FASTENER TORQUE (Nm)
                  </Text>
                </HStack>
                <Badge colorPalette={evaluation.torqueStatus === 'OK' ? 'green' : 'red'}>
                  {evaluation.torqueStatus === 'OK' ? 'TOLERANCE OK' : 'OUT OF SPEC'}
                </Badge>
              </HStack>
              <Input
                type="number"
                step="0.1"
                value={data.torqueNm ?? ''}
                onChange={(e) => onChange('torqueNm', parseFloat(e.target.value) || 0)}
                placeholder="Target: 40.0 - 50.0 Nm"
                size="sm"
                readOnly={isReadOnly}
              />
              <Text fontSize="2xs" color="gray.500" mt={1}>
                Criterion: Clamping torque must remain strictly within 40.0 – 50.0 Nm.
              </Text>
            </Box>

            {/* Dimensional Deviation */}
            <Box p={3} borderRadius="md" bg={statBg} borderWidth="1px" borderColor={cardBorder}>
              <HStack justify="space-between" mb={2}>
                <HStack gap={2}>
                  <Ruler size={16} color="#10B981" />
                  <Text fontSize="xs" fontWeight="700" color={labelColor}>
                    DIMENSION DEVIATION (mm)
                  </Text>
                </HStack>
                <Badge colorPalette={evaluation.dimensionStatus === 'OK' ? 'green' : 'red'}>
                  {evaluation.dimensionStatus === 'OK' ? 'WITHIN LIMIT' : 'EXCEEDED'}
                </Badge>
              </HStack>
              <Input
                type="number"
                step="0.001"
                value={data.dimensionDeviationMm ?? ''}
                onChange={(e) => onChange('dimensionDeviationMm', parseFloat(e.target.value) || 0)}
                placeholder="Target: ≤ ±0.05 mm"
                size="sm"
                readOnly={isReadOnly}
              />
              <Text fontSize="2xs" color="gray.500" mt={1}>
                Criterion: Critical dimension deviation must not exceed ±0.05 mm.
              </Text>
            </Box>

            {/* Defect Count */}
            <Box p={3} borderRadius="md" bg={statBg} borderWidth="1px" borderColor={cardBorder}>
              <HStack justify="space-between" mb={2}>
                <HStack gap={2}>
                  <Bug size={16} color="#EF4444" />
                  <Text fontSize="xs" fontWeight="700" color={labelColor}>
                    INLINE DEFECT COUNT
                  </Text>
                </HStack>
                <Badge colorPalette={evaluation.defectStatus === 'OK' ? 'green' : 'red'}>
                  {evaluation.defectStatus === 'OK' ? 'ZERO DEFECTS' : `${data.defectCount || 0} DEFECTS`}
                </Badge>
              </HStack>
              <Input
                type="number"
                step="1"
                value={data.defectCount ?? ''}
                onChange={(e) => onChange('defectCount', parseInt(e.target.value, 10) || 0)}
                placeholder="Target: 0 defects"
                size="sm"
                readOnly={isReadOnly}
              />
              <Text fontSize="2xs" color="gray.500" mt={1}>
                Criterion: Zero defects allowed per production lot sampling.
              </Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* 3. Overall Line QC Verdict Card */}
      <Card
        bg={evaluation.overallStatus === 'OK' ? 'green.50' : 'red.50'}
        _dark={{ bg: evaluation.overallStatus === 'OK' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}
        borderWidth="1px"
        borderColor={evaluation.overallStatus === 'OK' ? 'green.300' : 'red.300'}
        borderRadius="lg"
      >
        <CardBody p={4}>
          <HStack justify="space-between" align="center">
            <HStack gap={3}>
              {evaluation.overallStatus === 'OK' ? (
                <CheckCircle2 size={24} color="#16A34A" />
              ) : (
                <AlertTriangle size={24} color="#DC2626" />
              )}
              <Box>
                <Text fontSize="sm" fontWeight="800" color={evaluation.overallStatus === 'OK' ? 'green.800' : 'red.800'} _dark={{ color: evaluation.overallStatus === 'OK' ? 'green.200' : 'red.200' }}>
                  {evaluation.overallStatus === 'OK'
                    ? 'LINE QUALITY SPECIFICATION MET: LOT APPROVED (OK)'
                    : 'LINE QUALITY SPECIFICATION FAILED: NOT OK'}
                </Text>
                <Text fontSize="xs" color={evaluation.overallStatus === 'OK' ? 'green.700' : 'red.700'} _dark={{ color: evaluation.overallStatus === 'OK' ? 'green.300' : 'red.300' }}>
                  {evaluation.overallStatus === 'OK'
                    ? 'All physical criteria (visual, torque, dimensional, defect count) comply with manufacturing standards.'
                    : 'One or more line quality dimensions failed specifications. Detailed inspector remarks are mandatory.'}
                </Text>
              </Box>
            </HStack>
            <Badge
              fontSize="sm"
              px={3}
              py={1}
              colorPalette={evaluation.overallStatus === 'OK' ? 'green' : 'red'}
              borderRadius="md"
            >
              {evaluation.overallStatus}
            </Badge>
          </HStack>
        </CardBody>
      </Card>
    </VStack>
  );
};
