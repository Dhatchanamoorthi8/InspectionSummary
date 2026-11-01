import React from 'react';
import { Accordion as ChakraAccordion } from '@chakra-ui/react';

export interface AccordionProps extends Omit<ChakraAccordion.RootProps, 'collapsible'> {
  allowToggle?: boolean;
  allowMultiple?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({
  allowToggle = true,
  allowMultiple = false,
  children,
  ...rest
}) => {
  return (
    <ChakraAccordion.Root
      collapsible={allowToggle}
      multiple={allowMultiple}
      {...rest}
    >
      {children}
    </ChakraAccordion.Root>
  );
};

export const AccordionItem: React.FC<any> = ({
  value = 'item-1',
  children,
  ...rest
}) => {
  return (
    <ChakraAccordion.Item value={value} {...rest}>
      {children}
    </ChakraAccordion.Item>
  );
};

export const AccordionButton: React.FC<any> = ({ children, ...rest }) => {
  return (
    <ChakraAccordion.ItemTrigger {...rest}>
      {children}
    </ChakraAccordion.ItemTrigger>
  );
};

export const AccordionPanel: React.FC<any> = ({ children, ...rest }) => {
  return (
    <ChakraAccordion.ItemContent {...rest}>
      <ChakraAccordion.ItemBody>{children}</ChakraAccordion.ItemBody>
    </ChakraAccordion.ItemContent>
  );
};

export const AccordionIcon: React.FC<any> = (props) => {
  return <ChakraAccordion.ItemIndicator {...props} />;
};

