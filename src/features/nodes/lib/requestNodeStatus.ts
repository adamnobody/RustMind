import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';

/**
 * Смена статуса: у листа сразу, у родителя — через диалог «проставить детям?».
 * window.confirm в Tauri/WebView2 молча глотается, поэтому спрашиваем in-app.
 */
export function requestNodeStatus(nodeId: string, status: string | undefined): void {
  const store = useMindMapStore.getState();
  if (store.getDescendantIds(nodeId).length === 0) {
    store.updateNodeData(nodeId, { status });
    return;
  }
  useUIStore.getState().openStatusCascadePrompt({ nodeId, status });
}
