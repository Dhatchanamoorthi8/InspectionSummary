import { Collapsible as ChakraCollapsible } from '@chakra-ui/react';
import * as React from 'react';

export interface CollapseProps {
  in?: boolean;
  open?: boolean;
  animateOpacity?: boolean;
  children: React.ReactNode;
}

export const Collapse: React.FC<CollapseProps> = ({
  in: inProp,
  open,
  children,
  ...rest
}) => {
  const isOpen = open ?? inProp ?? false;
  return (
    <ChakraCollapsible.Root open={isOpen} {...rest}>
      <ChakraCollapsible.Content>
        {children}
      </ChakraCollapsible.Content>
    </ChakraCollapsible.Root>
  );
};

export const Collapsible = ChakraCollapsible;

