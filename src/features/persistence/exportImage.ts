import { toPng, toSvg, toJpeg } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUIStore } from '../../store/uiStore';
import { fileService } from './fileService';
import { jpegToPdf } from './exportPdf';
import { serializeMindMap } from './serializer';
import { mapToMarkdown } from './exportMarkdown';
import { projectNameFromPath } from './recentFiles';

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'json' | 'markdown';

const MAX_DIM = 2400;
const MIN_DIM = 640;
const PAD = 0.08;

export const EXPORT_FORMATS: ExportFormat[] = ['png', 'svg', 'pdf', 'json', 'markdown'];

/** data:...;base64,XXX → Uint8Array (для PNG/JPEG). */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** html-to-image toSvg отдаёт URL-кодированный data:image/svg+xml — вернуть исходный XML. */
function svgDataUrlToString(dataUrl: string): string {
  const comma = dataUrl.indexOf(',') + 1;
  const payload = dataUrl.slice(comma);
  if (dataUrl.slice(0, comma).includes('base64')) {
    const bin = atob(payload);
    return bin;
  }
  return decodeURIComponent(payload);
}

/** Размер картинки под форму карты: длинная сторона в [MIN_DIM, MAX_DIM]. */
function exportSize(bw: number, bh: number): { width: number; height: number } {
  const aspect = bw > 0 && bh > 0 ? bw / bh : 1;
  let width: number;
  let height: number;
  if (aspect >= 1) {
    width = Math.min(MAX_DIM, Math.max(MIN_DIM, Math.round(bw * 2)));
    height = Math.round(width / aspect);
  } else {
    height = Math.min(MAX_DIM, Math.max(MIN_DIM, Math.round(bh * 2)));
    width = Math.round(height * aspect);
  }
  return { width, height };
}

const EXTS: Record<ExportFormat, { ext: string; label: string }> = {
  png: { ext: 'png', label: 'PNG image' },
  svg: { ext: 'svg', label: 'SVG image' },
  pdf: { ext: 'pdf', label: 'PDF document' },
  json: { ext: 'json', label: 'JSON' },
  markdown: { ext: 'md', label: 'Markdown' },
};

function exportBaseName(): string {
  const { documentName, filePath } = useMindMapStore.getState();
  return filePath ? projectNameFromPath(filePath) : documentName;
}

async function pickPath(format: ExportFormat): Promise<string | null> {
  return fileService.showSaveImageDialog(exportBaseName(), EXTS[format].ext, EXTS[format].label);
}

async function exportText(format: 'json' | 'markdown'): Promise<boolean> {
  const state = useMindMapStore.getState();
  const path = await pickPath(format);
  if (!path) return false;
  const name = exportBaseName();
  const body =
    format === 'json'
      ? JSON.stringify(
          serializeMindMap(
            name,
            state.layoutType,
            state.nodes,
            state.edges,
            state.projectSettings,
            state.groups,
            state.createdAt,
          ),
          null,
          2,
        )
      : mapToMarkdown(state.nodes, state.edges, name);
  await fileService.saveTextToPath(path, body);
  return true;
}

/**
 * Экспорт карты: PNG/SVG/PDF через снимок холста, JSON — сериализация документа,
 * Markdown — дерево вложенным списком. Бросает при ошибке I/O — ловлю снаружи.
 */
export async function exportMindMap(format: ExportFormat): Promise<boolean> {
  if (format === 'json' || format === 'markdown') return exportText(format);

  const { nodes } = useMindMapStore.getState();
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewport || nodes.length === 0) return false;

  const bounds = getNodesBounds(nodes);
  const { width, height } = exportSize(bounds.width, bounds.height);
  const t = getViewportForBounds(bounds, width, height, 0.2, 4, PAD);
  const theme = useUIStore.getState().theme;
  const background = theme === 'dark' ? '#05070a' : '#ffffff';

  const options = {
    backgroundColor: background,
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${t.x}px, ${t.y}px) scale(${t.zoom})`,
    },
  };

  const path = await pickPath(format);
  if (!path) return false;

  if (format === 'svg') {
    const dataUrl = await toSvg(viewport, options);
    await fileService.saveTextToPath(path, svgDataUrlToString(dataUrl));
    return true;
  }
  if (format === 'png') {
    const dataUrl = await toPng(viewport, options);
    await fileService.saveBytesToPath(path, dataUrlToBytes(dataUrl));
    return true;
  }
  const dataUrl = await toJpeg(viewport, { ...options, quality: 0.92 });
  const pdf = jpegToPdf(dataUrlToBytes(dataUrl), width, height);
  await fileService.saveBytesToPath(path, pdf);
  return true;
}
