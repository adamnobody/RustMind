import { SerializedMindMap } from './schema';

export const fileService = {
  async saveFile(_path: string, _content: SerializedMindMap): Promise<void> {
    // Save file stub
  },
  async openFile(): Promise<{ path: string; data: SerializedMindMap } | null> {
    // Open file stub
    return null;
  },
};
