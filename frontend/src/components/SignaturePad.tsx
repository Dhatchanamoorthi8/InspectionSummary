import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Text,
  Image,
  Input,
  VStack,
} from '@chakra-ui/react';
import { useToast } from './ui/toaster';
import { useColorModeValue } from './ui/color-mode';
import { Trash2, Upload, Check } from 'lucide-react';
import { qcColors } from '../theme/colors';

interface SignaturePadProps {
  initialSignature?: string | null;
  onSave: (signatureData: string) => void | Promise<void>;
  isLoading?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  initialSignature,
  onSave,
  isLoading = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialSignature || null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

  const previewBoxBg = useColorModeValue('white', 'gray.800');
  const previewBoxBorder = useColorModeValue('industrial.200', 'gray.700');
  const previewImageBg = useColorModeValue('gray.50', 'white');
  const drawHeadingColor = useColorModeValue('industrial.800', 'gray.200');
  const dashedBorder = useColorModeValue('industrial.300', 'gray.600');

  useEffect(() => {
    if (initialSignature) {
      setPreviewUrl(initialSignature);
    }
  }, [initialSignature]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = qcColors.industrial.ink;
  }, []);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCoordinates(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a valid PNG or JPEG image.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image file size must be less than 2MB.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewUrl(result);

      // Load image into canvas
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw image scaled
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasDrawn && !previewUrl) {
      toast({
        title: 'Signature required',
        description: 'Please draw or upload your signature before saving.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    let finalDataUrl = previewUrl || '';
    if (hasDrawn) {
      finalDataUrl = canvas.toDataURL('image/png');
    }

    onSave(finalDataUrl);
  };

  return (
    <VStack gap={4} align="stretch" w="full">
      {/* Existing / Preview Signature */}
      {previewUrl && (
        <Box
          p={3}
          borderWidth="1px"
          borderColor={previewBoxBorder}
          borderRadius="md"
          bg={previewBoxBg}
        >
          <Text fontSize="xs" fontWeight="700" color="gray.500" mb={2}>
            ACTIVE SIGNATURE SNAPSHOT
          </Text>
          <Box
            bg={previewImageBg}
            p={2}
            borderRadius="sm"
            display="inline-block"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <Image
              src={previewUrl}
              alt="Digital Signature"
              maxH="80px"
              objectFit="contain"
            />
          </Box>
        </Box>
      )}

      {/* Signature Canvas Drawing Area */}
      <Box>
        <Text fontSize="xs" fontWeight="700" color={drawHeadingColor} mb={1}>
          DRAW SIGNATURE
        </Text>
        <Box
          w="full"
          maxW="450px"
          borderWidth="2px"
          borderStyle="dashed"
          borderColor={dashedBorder}
          borderRadius="md"
          bg="white"
          p={1}
          display="flex"
          justifyContent="center"
          overflow="hidden"
        >
          <canvas
            ref={canvasRef}
            width={450}
            height={160}
            style={{
              width: '100%',
              maxWidth: '450px',
              height: '160px',
              touchAction: 'none',
              cursor: 'crosshair',
              display: 'block',
              background: 'white',
              borderRadius: '4px',
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </Box>
      </Box>

      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
        <HStack gap={2}>
          <Button
            size="sm"
            variant="outline"
            onClick={clearCanvas}
            disabled={isLoading}
          >
            <Trash2 size={16} />
            Clear Canvas
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Upload size={16} />
            Upload Image
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg"
            display="none"
            onChange={handleFileUpload}
          />
        </HStack>

        <Button
          size="sm"
          colorPalette="blue"
          onClick={handleSave}
          loading={isLoading}
        >
          <Check size={16} />
          Save Signature
        </Button>
      </Flex>
    </VStack>
  );
};
