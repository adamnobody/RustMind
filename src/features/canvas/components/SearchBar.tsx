import { useCallback, useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/Icon/Icon';
import type { AppNode } from '../../../store/types';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';
import styles from './SearchBar.module.css';

function matchNodes(nodes: AppNode[], query: string): AppNode[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  return nodes.filter((n) => String(n.data.label ?? '').toLowerCase().includes(q));
}

/**
 * Строка поиска по узлам (Ctrl+F). Центрирует камеру на текущем совпадении;
 * Enter / стрелки листают. Подсветку рисует сам MindNode (читает searchQuery).
 * Живёт внутри ReactFlowProvider — нужен useReactFlow().setCenter.
 */
export function SearchBar(): React.JSX.Element | null {
  const t = useT();
  const searchOpen = useUIStore((s) => s.searchOpen);
  const query = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const toggleSearch = useUIStore((s) => s.toggleSearch);
  const nodes = useMindMapStore((s) => s.nodes);
  const { setCenter } = useReactFlow();
  const [index, setIndex] = useState(0);

  const matches = useMemo(() => matchNodes(nodes, query), [nodes, query]);

  const centerOn = useCallback(
    (node: AppNode | undefined) => {
      if (!node) return;
      const w = node.measured?.width ?? DEFAULT_NODE_SIZE.width;
      const h = node.measured?.height ?? DEFAULT_NODE_SIZE.height;
      setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.2, duration: 400 });
    },
    [setCenter],
  );

  const go = useCallback(
    (list: AppNode[], i: number) => {
      if (list.length === 0) return;
      const wrapped = ((i % list.length) + list.length) % list.length;
      setIndex(wrapped);
      centerOn(list[wrapped]);
    },
    [centerOn],
  );

  if (!searchOpen) return null;

  return (
    <div className={styles.bar} onKeyDown={(e) => e.stopPropagation()}>
      <Icon name="search" size={15} className={styles.icon} />
      <input
        className={styles.input}
        value={query}
        autoFocus
        placeholder={t('search.placeholder')}
        onChange={(e) => {
          const q = e.target.value;
          setSearchQuery(q);
          go(matchNodes(nodes, q), 0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            go(matches, e.shiftKey ? index - 1 : index + 1);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            toggleSearch();
          }
        }}
      />
      <span className={styles.count}>
        {matches.length > 0 ? `${index + 1}/${matches.length}` : t('search.none')}
      </span>
      <button
        type="button"
        className={styles.navBtn}
        disabled={matches.length === 0}
        aria-label={t('search.prev')}
        onClick={() => go(matches, index - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        className={styles.navBtn}
        disabled={matches.length === 0}
        aria-label={t('search.next')}
        onClick={() => go(matches, index + 1)}
      >
        ↓
      </button>
      <button
        type="button"
        className={styles.navBtn}
        aria-label={t('search.close')}
        onClick={toggleSearch}
      >
        ×
      </button>
    </div>
  );
}
