import React from 'react';
import { Box, BoxProps } from '@chakra-ui/react';
import { Layout } from './Layout';
import { SectionHeader } from './SectionHeader';

export interface PageContainerProps extends BoxProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  category?: string;
  actions?: React.ReactNode;
  useLayoutWrapper?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  description,
  category,
  actions,
  useLayoutWrapper = true,
  ...boxProps
}) => {
  const content = (
    <Box
      w="full"
      maxW="1600px"
      mx="auto"
      {...boxProps}
    >
      {title && (
        <SectionHeader
          title={title}
          description={description}
          category={category}
          actions={actions}
        />
      )}
      {children}
    </Box>
  );

  if (useLayoutWrapper) {
    return <Layout>{content}</Layout>;
  }

  return content;
};

export default PageContainer;

