import React from 'react';
import { Box, Flex, Heading, Text, HStack } from '@chakra-ui/react';
import { useColorModeValue } from './ui/color-mode';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  category?: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  category,
  actions,
}) => {
  const titleColor = useColorModeValue('industrial.900', 'white');
  const descriptionColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Flex
      justify="space-between"
      align={{ base: 'flex-start', sm: 'center' }}
      direction={{ base: 'column', sm: 'row' }}
      gap={4}
      mb={6}
    >
      <Box>
        {category && (
          <Text
            fontSize="2xs"
            fontWeight="700"
            color="brand.600"
            textTransform="uppercase"
            letterSpacing="wider"
            mb={0.5}
          >
            {category}
          </Text>
        )}
        <Heading
          as="h1"
          size="lg"
          color={titleColor}
          fontWeight="800"
          lineHeight="1.2"
        >
          {title}
        </Heading>
        {description && (
          <Text fontSize="xs" color={descriptionColor} mt={1}>
            {description}
          </Text>
        )}
      </Box>

      {actions && (
        <HStack gap={2} wrap="wrap" w={{ base: 'full', sm: 'auto' }} justify="flex-start">
          {actions}
        </HStack>
      )}
    </Flex>
  );
};
