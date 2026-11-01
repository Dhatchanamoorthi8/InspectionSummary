import React from 'react';
import { Box, Flex, Heading, Text, Button, Icon } from '@chakra-ui/react';
import { useColorModeValue } from './ui/color-mode';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  const containerBg = useColorModeValue('industrial.50', 'gray.800');
  const containerBorder = useColorModeValue('industrial.300', 'gray.700');
  const iconCircleBg = useColorModeValue('industrial.100', 'gray.700');
  const iconColor = useColorModeValue('industrial.500', 'gray.400');
  const titleColor = useColorModeValue('industrial.800', 'gray.100');

  return (
    <Box
      p={{ base: 6, md: 8 }}
      textAlign="center"
      borderRadius="lg"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor={containerBorder}
      bg={containerBg}
      w="full"
      my={4}
    >
      <Flex justify="center" mb={3}>
        <Flex
          w={12}
          h={12}
          borderRadius="full"
          bg={iconCircleBg}
          align="center"
          justify="center"
        >
          <Icon as={icon} boxSize={6} color={iconColor} />
        </Flex>
      </Flex>
      <Heading as="h3" fontSize="sm" fontWeight="700" color={titleColor} mb={1}>
        {title}
      </Heading>
      {description && (
        <Text fontSize="xs" color="gray.500" maxW="400px" mx="auto" mb={actionLabel ? 4 : 0}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          colorPalette="blue"
          onClick={onAction}
          mt={3}
        >
          {actionIcon && <Icon as={actionIcon} boxSize={4} mr={1.5} />}
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};
