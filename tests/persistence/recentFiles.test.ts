import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRecentFiles,
  addRecentFile,
  removeRecentFile,
  projectNameFromPath,
  siblingPath,
} from '../../src/features/persistence/recentFiles';

describe('recentFiles (шаг 19)', () => {
  beforeEach(() => {
    window.localStorage.removeItem('rustmind-recent');
  });

  it('add → get: запись сохраняется с path/name/openedAt', () => {
    addRecentFile('C:\\maps\\a.rustmind', 'Карта А');

    const files = getRecentFiles();
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('C:\\maps\\a.rustmind');
    expect(files[0].name).toBe('Карта А');
    expect(Number.isNaN(new Date(files[0].openedAt).getTime())).toBe(false);
  });

  it('повторное добавление того же пути поднимает запись наверх без дубля', () => {
    addRecentFile('C:\\a.rustmind', 'А');
    addRecentFile('C:\\b.rustmind', 'Б');
    addRecentFile('C:\\a.rustmind', 'А (обновлено)');

    const files = getRecentFiles();
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe('C:\\a.rustmind');
    expect(files[0].name).toBe('А (обновлено)');
    expect(files[1].path).toBe('C:\\b.rustmind');
  });

  it('список ограничен 8 записями — старые вытесняются', () => {
    for (let i = 0; i < 10; i++) {
      addRecentFile(`C:\\map${i}.rustmind`, `Карта ${i}`);
    }

    const files = getRecentFiles();
    expect(files).toHaveLength(8);
    expect(files[0].path).toBe('C:\\map9.rustmind'); // самая свежая сверху
    expect(files.some((f) => f.path === 'C:\\map0.rustmind')).toBe(false);
  });

  it('projectNameFromPath — базовое имя без .rustmind, оба разделителя пути', () => {
    expect(projectNameFromPath('C:\\maps\\Моя карта.rustmind')).toBe('Моя карта');
    expect(projectNameFromPath('/home/user/plan.rustmind')).toBe('plan');
    expect(projectNameFromPath('C:\\maps\\noext')).toBe('noext');
  });

  it('siblingPath — файл-сосед в той же папке, оба разделителя', () => {
    expect(siblingPath('C:\\maps\\old.rustmind', 'new')).toBe('C:\\maps\\new.rustmind');
    expect(siblingPath('/home/u/a.rustmind', 'a копия')).toBe('/home/u/a копия.rustmind');
  });

  it('removeRecentFile убирает только указанный путь', () => {
    addRecentFile('C:\\a.rustmind', 'А');
    addRecentFile('C:\\b.rustmind', 'Б');

    removeRecentFile('C:\\a.rustmind');

    const files = getRecentFiles();
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('C:\\b.rustmind');
  });

  it('мусор в localStorage → пустой список, без исключений', () => {
    window.localStorage.setItem('rustmind-recent', 'не json {{{');
    expect(getRecentFiles()).toEqual([]);

    window.localStorage.setItem('rustmind-recent', JSON.stringify({ nope: true }));
    expect(getRecentFiles()).toEqual([]);

    // частично валидный массив — выживают только корректные записи
    window.localStorage.setItem(
      'rustmind-recent',
      JSON.stringify([{ path: 'C:\\ok.rustmind', name: 'ОК', openedAt: '2026-01-01' }, 42, null]),
    );
    expect(getRecentFiles()).toHaveLength(1);
  });
});
