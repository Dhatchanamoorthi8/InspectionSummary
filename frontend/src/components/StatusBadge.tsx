import React from 'react';
import { Badge, BadgeProps } from '@chakra-ui/react';
import { useColorModeValue } from './ui/color-mode';

interface StatusBadgeProps extends Omit<BadgeProps, 'colorPalette'> {
  status: string | null | undefined;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, ...rest }) => {
  const naBg = useColorModeValue('gray.100', 'gray.800');
  const naColor = useColorModeValue('gray.600', 'gray.400');

  if (!status) {
    return (
      <Badge bg={naBg} color={naColor} {...rest}>
        N/A
      </Badge>
    );
  }

  const s = status.trim().toUpperCase();

  let palette: 'green' | 'red' | 'orange' | 'gray' = 'gray';
  let label = status;

  if (s === 'OK') {
    palette = 'green';
    label = 'OK';
  } else if (s === 'NOT_OK' || s === 'NOT OK' || s === 'FAIL') {
    palette = 'red';
    label = 'NOT OK';
  } else if (s === 'ASSIGNED' || s === 'IN PROGRESS' || s === 'IN_PROGRESS' || s === 'PENDING') {
    palette = 'orange';
    label = status === 'IN_PROGRESS' ? 'In Progress' : status;
  } else if (s === 'COMPLETED') {
    palette = 'green';
    label = 'Completed';
  } else if (s === 'DRAFT') {
    palette = 'gray';
    label = 'Draft';
  } else if (s === 'CANCELLED') {
    palette = 'gray';
    label = 'Cancelled';
  }

  return (
    <Badge
      colorPalette={palette}
      variant="subtle"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      px={2.5}
      py={0.5}
      borderRadius="full"
      fontWeight="700"
      fontSize="xs"
      letterSpacing="0.05em"
      textTransform="uppercase"
      {...rest}
    >
      {label}
    </Badge>
  );
};
