import { Tabs as ChakraTabs } from '@chakra-ui/react';
import * as React from 'react';

const TabsContext = React.createContext<{
  activeTab: string;
  setActiveTab: (val: string) => void;
}>({ activeTab: '0', setActiveTab: () => {} });

export interface TabsProps {
  index?: number;
  defaultIndex?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (index: number) => void;
  onValueChange?: (e: { value: string }) => void;
  children: React.ReactNode;
  [key: string]: any;
}

export const Tabs: React.FC<TabsProps> = ({
  index,
  defaultIndex,
  value,
  defaultValue,
  onChange,
  onValueChange,
  children,
  ...rest
}) => {
  const [internalValue, setInternalValue] = React.useState<string>(
    value ??
      (index !== undefined
        ? String(index)
        : defaultValue ??
          (defaultIndex !== undefined ? String(defaultIndex) : '0'))
  );

  const activeValue =
    value ?? (index !== undefined ? String(index) : internalValue);

  const handleValueChange = (e: { value: string }) => {
    setInternalValue(e.value);
    onValueChange?.(e);
    if (onChange) {
      const parsed = parseInt(e.value, 10);
      onChange(isNaN(parsed) ? 0 : parsed);
    }
  };

  return (
    <TabsContext.Provider
      value={{
        activeTab: activeValue,
        setActiveTab: (v) => handleValueChange({ value: v }),
      }}
    >
      <ChakraTabs.Root
        value={activeValue}
        onValueChange={handleValueChange}
        {...rest}
      >
        {children}
      </ChakraTabs.Root>
    </TabsContext.Provider>
  );
};

export const TabList: React.FC<any> = ({ children, ...rest }) => {
  return (
    <ChakraTabs.List {...rest}>
      {React.Children.map(children, (child: any, idx: number) => {
        if (!React.isValidElement(child)) return child;
        const val = (child as any).props?.value ?? String(idx);
        return React.cloneElement(child, { value: val, _index: idx } as any);
      })}
    </ChakraTabs.List>
  );
};

export const Tab: React.FC<any> = ({ children, value, _index, _selected, ...rest }) => {
  const val = value ?? String(_index ?? 0);
  const context = React.useContext(TabsContext);
  const isSelected = context.activeTab === val;

  return (
    <ChakraTabs.Trigger
      value={val}
      data-selected={isSelected ? '' : undefined}
      {...(_selected ? { _selected } : {})}
      {...rest}
    >
      {children}
    </ChakraTabs.Trigger>
  );
};

export const TabPanels: React.FC<any> = ({ children, ...rest }) => {
  return (
    <div {...rest}>
      {React.Children.map(children, (child: any, idx: number) => {
        if (!React.isValidElement(child)) return child;
        const val = (child as any).props?.value ?? String(idx);
        return React.cloneElement(child, { value: val, _index: idx } as any);
      })}
    </div>
  );
};

export const TabPanel: React.FC<any> = ({
  children,
  value,
  _index,
  ...rest
}) => {
  const val = value ?? String(_index ?? 0);
  return (
    <ChakraTabs.Content value={val} {...rest}>
      {children}
    </ChakraTabs.Content>
  );
};

export const TabsRoot = ChakraTabs.Root;
export const TabsList = ChakraTabs.List;
export const TabsTrigger = ChakraTabs.Trigger;
export const TabsContent = ChakraTabs.Content;
