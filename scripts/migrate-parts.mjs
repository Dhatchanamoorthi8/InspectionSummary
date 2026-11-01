import fs from 'fs';

let code = fs.readFileSync('frontend/src/pages/PartMasterPage.tsx', 'utf-8');

// Replace chakra import
code = code.replace(
  /import\s*\{\s*Box,\s*Heading,\s*Text,\s*Flex,\s*Button,\s*HStack,\s*Input,\s*VStack,\s*useToast,\s*Modal,\s*ModalOverlay,\s*ModalContent,\s*ModalHeader,\s*ModalBody,\s*ModalFooter,\s*ModalCloseButton,\s*Badge,\s*Icon,\s*Table,\s*Thead,\s*Tbody,\s*Tr,\s*Th,\s*Td,\s*TableContainer,\s*Tabs,\s*TabList,\s*TabPanels,\s*Tab,\s*TabPanel,\s*useColorModeValue,\s*Collapse,\s*Tooltip,\s*\}\s*from\s*'@chakra-ui\/react';/,
  `import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  HStack,
  Input,
  VStack,
  Badge,
  Icon,
} from '@chakra-ui/react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Collapse,
  Tooltip,
  useToast,
  useColorModeValue,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from '../components/ui';`
);

// Replace Modal with DialogRoot
code = code.replace(
  /<Modal[\s\S]*?isOpen=\{isCreateOpen\}[\s\S]*?<\/Modal>/,
  `<DialogRoot
        open={isCreateOpen}
        onOpenChange={(e) => setIsCreateOpen(e.open)}
        placement="center"
      >
        <DialogContent
          as="form"
          onSubmit={handleCreateSubmit}
          bg={cardBg}
          borderRadius="lg"
          mx={4}
          borderWidth="1px"
          borderColor={borderColor}
          boxShadow="2xl"
        >
          <DialogHeader>
            <DialogTitle fontSize="md" fontWeight="800">
              {newPartName ? \`Add Part Number to "\${newPartName}"\` : 'Create New Part Mapping'}
            </DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
            <VStack gap={4}>
              <FormField
                ref={initialFocusRef}
                id="part-name-input"
                label="PART NAME"
                isRequired
                placeholder="e.g. Turbine Blade or TM BKT"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
              />

              <FormField
                id="part-number-input"
                label="PART NUMBER"
                isRequired
                placeholder="e.g. TB-2001 or TM-BKT-002"
                value={newPartNumber}
                onChange={(e) => setNewPartNumber(e.target.value)}
                fontFamily="mono"
              />
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorPalette="blue"
              size="sm"
              loading={isCreating}
              disabled={!newPartName.trim() || !newPartNumber.trim()}
            >
              Add Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>`
);

// Replace colorScheme="brand" -> colorPalette="blue"
code = code.replace(/colorScheme="brand"/g, 'colorPalette="blue"');
code = code.replace(/colorScheme="teal"/g, 'colorPalette="teal"');
code = code.replace(/colorScheme="yellow"/g, 'colorPalette="yellow"');
code = code.replace(/colorScheme="green"/g, 'colorPalette="green"');
code = code.replace(/colorScheme="red"/g, 'colorPalette="red"');
code = code.replace(/colorScheme="orange"/g, 'colorPalette="orange"');
code = code.replace(/colorScheme="blue"/g, 'colorPalette="blue"');
code = code.replace(/colorScheme="gray"/g, 'colorPalette="gray"');
code = code.replace(/colorScheme=\{([^}]+)\}/g, 'colorPalette={$1}');

// Replace spacing={...} with gap={...}
code = code.replace(/spacing=\{/g, 'gap={');

// Replace leftIcon={<Icon ... />} on Buttons
code = code.replace(/leftIcon=\{<RefreshCw size=\{14\} \/>\}/g, '');
code = code.replace(/>\s*Refresh\s*<\/Button>/g, '><RefreshCw size={14} /> Refresh</Button>');

code = code.replace(/leftIcon=\{<Download size=\{14\} \/>\}/g, '');
code = code.replace(/>\s*Download CSV Template\s*<\/Button>/g, '><Download size={14} /> Download CSV Template</Button>');
code = code.replace(/>\s*Download Template\s*<\/Button>/g, '><Download size={14} /> Download Template</Button>');

code = code.replace(/leftIcon=\{<Plus size=\{15\} \/>\}/g, '');
code = code.replace(/>\s*Add New Part\s*<\/Button>/g, '><Plus size={15} /> Add New Part</Button>');

code = code.replace(/leftIcon=\{<Plus size=\{13\} \/>\}/g, '');
code = code.replace(/>\s*Add Part Number\s*<\/Button>/g, '><Plus size={13} /> Add Part Number</Button>');

code = code.replace(/leftIcon=\{<ListTree size=\{13\} \/>\}/g, '');
code = code.replace(/>\s*Grouped \(Collapsible\)\s*<\/Button>/g, '><ListTree size={13} /> Grouped (Collapsible)</Button>');

code = code.replace(/leftIcon=\{<List size=\{13\} \/>\}/g, '');
code = code.replace(/>\s*Flat List\s*<\/Button>/g, '><List size={13} /> Flat List</Button>');

code = code.replace(/leftIcon=\{<CheckCircle size=\{12\} \/>\}/g, '');
code = code.replace(/>\s*Activate\s*<\/Button>/g, '><CheckCircle size={12} /> Activate</Button>');

code = code.replace(/leftIcon=\{<Trash2 size=\{12\} \/>\}/g, '');
code = code.replace(/>\s*Delete\s*<\/Button>/g, '><Trash2 size={12} /> Delete</Button>');

// Replace isDisabled on Buttons
code = code.replace(/isDisabled=\{/g, 'disabled={');

// Replace isLoading on Buttons
code = code.replace(/isLoading=\{isLoading\}/g, 'loading={isLoading}');
code = code.replace(/isLoading=\{isCommitting\}/g, 'loading={isCommitting}');

fs.writeFileSync('frontend/src/pages/PartMasterPage.tsx', code, 'utf-8');
console.log('PartMasterPage refactored successfully!');

