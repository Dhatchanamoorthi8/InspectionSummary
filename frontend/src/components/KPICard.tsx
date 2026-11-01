import React from 'react';
import { Flex, Box, Text, Icon, Badge } from '@chakra-ui/react';
import { Card, CardBody } from './ui/card';
import { useColorModeValue } from './ui/color-mode';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  colorScheme?: 'blue' | 'green' | 'red' | 'orange' | 'gray' | 'purple';
  subtext?: string;
  badge?: string;
  compact?: boolean;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  colorScheme = 'blue',
  subtext,
  badge,
  compact = false,
  onClick,
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('industrial.200', 'gray.700');
  const valueColor = useColorModeValue('industrial.900', 'white');
  const titleColor = useColorModeValue('gray.600', 'gray.300');

  const blueBg = useColorModeValue('blue.50', 'rgba(37, 99, 235, 0.2)');
  const greenBg = useColorModeValue('green.50', 'rgba(22, 101, 52, 0.2)');
  const redBg = useColorModeValue('red.50', 'rgba(153, 27, 27, 0.2)');
  const orangeBg = useColorModeValue('orange.50', 'rgba(194, 65, 12, 0.2)');
  const grayBg = useColorModeValue('gray.50', 'rgba(71, 85, 105, 0.2)');
  const purpleBg = useColorModeValue('purple.50', 'rgba(147, 51, 234, 0.2)');

  const schemeStyles = {
    blue: {
      bg: blueBg,
      iconColor: 'brand.500',
      borderColor: 'brand.500',
    },
    green: {
      bg: greenBg,
      iconColor: 'qc.status.ok.bg',
      borderColor: 'qc.status.ok.bg',
    },
    red: {
      bg: redBg,
      iconColor: 'qc.status.notOk.bg',
      borderColor: 'qc.status.notOk.bg',
    },
    orange: {
      bg: orangeBg,
      iconColor: 'qc.status.pending.bg',
      borderColor: 'qc.status.pending.bg',
    },
    gray: {
      bg: grayBg,
      iconColor: 'qc.status.draft.bg',
      borderColor: 'qc.status.draft.bg',
    },
    purple: {
      bg: purpleBg,
      iconColor: 'purple.500',
      borderColor: 'purple.500',
    },
  }[colorScheme];

  const badgeColorPalette =
    colorScheme === 'red'
      ? 'red'
      : colorScheme === 'green'
      ? 'green'
      : colorScheme === 'orange'
      ? 'orange'
      : colorScheme === 'purple'
      ? 'purple'
      : 'blue';

  if (compact) {
    return (
      <Card
        p={0}
        bg={cardBg}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={borderColor}
        borderLeftWidth="3px"
        borderLeftColor={schemeStyles.borderColor}
        boxShadow="sm"
        cursor={onClick ? 'pointer' : 'default'}
        transition="transform 160ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 160ms ease-out"
        _hover={
          onClick
            ? {
                transform: 'translateY(-2px)',
                boxShadow: 'md',
              }
            : undefined
        }
        _active={
          onClick
            ? {
                transform: 'scale(0.98)',
                transition: 'transform 80ms cubic-bezier(0.23, 1, 0.32, 1)',
              }
            : undefined
        }
        onClick={onClick}
      >
        <CardBody p={2.5}>
          {/* Row 1: Full-width Title + Corner Icon */}
          <Flex justify="space-between" align="flex-start" gap={1} mb={1}>
            <Box minW={0} flex={1} minH={{ base: 'auto', lg: '28px' }}>
              <Text
                fontSize="2xs"
                fontWeight="700"
                color={titleColor}
                textTransform="uppercase"
                letterSpacing="wider"
                lineHeight="1.25"
                whiteSpace="normal"
                wordBreak="break-word"
                title={title}
              >
                {title}
              </Text>
            </Box>
            <Flex
              w={6}
              h={6}
              borderRadius="full"
              bg={schemeStyles.bg}
              align="center"
              justify="center"
              flexShrink={0}
              ml={1}
            >
              <Icon as={icon} boxSize={3} color={schemeStyles.iconColor} />
            </Flex>
          </Flex>

          {/* Row 2: Prominent Value on left + Specification Badge on right */}
          <Flex justify="space-between" align="baseline" gap={1} mt={0.5}>
            <Text
              fontSize={{ base: 'md', md: 'lg', xl: 'xl' }}
              fontWeight="800"
              color={valueColor}
              lineHeight="1"
            >
              {value}
            </Text>
            {badge && (
              <Badge
                fontSize="3xs"
                fontWeight="700"
                colorPalette={badgeColorPalette}
                variant="subtle"
                px={1}
                py={0}
                flexShrink={0}
                letterSpacing="tight"
              >
                {badge}
              </Badge>
            )}
          </Flex>

          {/* Row 3: Subtext context */}
          {subtext && (
            <Text
              fontSize="2xs"
              color="gray.400"
              mt={1.5}
              fontWeight="500"
              truncate
              title={subtext}
            >
              {subtext}
            </Text>
          )}
        </CardBody>
      </Card>
    );
  }

  // Default / Standard Non-Compact Card
  return (
    <Card
      p={0}
      bg={cardBg}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      borderLeftWidth="4px"
      borderLeftColor={schemeStyles.borderColor}
      boxShadow="sm"
      cursor={onClick ? 'pointer' : 'default'}
      transition="transform 160ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 160ms ease-out"
      _hover={
        onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: 'md',
            }
          : undefined
      }
      _active={
        onClick
          ? {
              transform: 'scale(0.98)',
              transition: 'transform 80ms cubic-bezier(0.23, 1, 0.32, 1)',
            }
          : undefined
      }
      onClick={onClick}
    >
      <CardBody p={4}>
        <Flex justify="space-between" align="center" gap={1}>
          <Box minW={0} flex={1}>
            <Flex gap={1.5} align="center" mb={0.5} wrap="wrap">
              <Text
                fontSize="xs"
                fontWeight="700"
                color={titleColor}
                textTransform="uppercase"
                letterSpacing="wider"
                title={title}
              >
                {title}
              </Text>
              {badge && (
                <Badge
                  fontSize="2xs"
                  fontWeight="700"
                  colorPalette={badgeColorPalette}
                  variant="subtle"
                  px={1.5}
                  py={0.5}
                  flexShrink={0}
                >
                  {badge}
                </Badge>
              )}
            </Flex>
            <Text
              fontSize={{ base: 'xl', md: '2xl' }}
              fontWeight="800"
              color={valueColor}
              lineHeight="1.1"
              mt={0.5}
            >
              {value}
            </Text>
            {subtext && (
              <Text
                fontSize="xs"
                color="gray.400"
                mt={0.5}
                fontWeight="500"
                truncate
                title={subtext}
              >
                {subtext}
              </Text>
            )}
          </Box>
          <Flex
            w={12}
            h={12}
            borderRadius="full"
            bg={schemeStyles.bg}
            align="center"
            justify="center"
            flexShrink={0}
            ml={2}
          >
            <Icon as={icon} boxSize={6} color={schemeStyles.iconColor} />
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
};
