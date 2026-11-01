import React from 'react';
import { Flex, Box } from '@chakra-ui/react';
import { Card, CardBody } from './ui/card';
import { Skeleton, SkeletonCircle } from './ui/skeleton';
import { useColorModeValue } from './ui/color-mode';

export const KPICardSkeleton: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('industrial.200', 'gray.700');

  return (
    <Card
      bg={cardBg}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={cardBorder}
      boxShadow="sm"
    >
      <CardBody p={4}>
        <Flex justify="space-between" align="center">
          <Box w="60%">
            <Skeleton h="12px" w="70%" mb={2} borderRadius="sm" />
            <Skeleton h="28px" w="50%" borderRadius="sm" />
          </Box>
          <SkeletonCircle size="12" />
        </Flex>
      </CardBody>
    </Card>
  );
};
