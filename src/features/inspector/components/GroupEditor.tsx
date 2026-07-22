import { useEffect, useState } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { listSystemFonts, FALLBACK_FONTS } from '../../../shared/lib/fonts';
import { useT } from '../../../shared/i18n';
import { ColorField, FontField, NumberField, TextField, ToggleGroupField } from './fields';

const DEFAULT_TITLE_SIZE = 12;
const COLOR_SEED = { fill: '#5fd4ff', text: '#e2e8f0' } as const;

interface GroupEditorProps {
  groupId: string;
}

export function GroupEditor({ groupId }: GroupEditorProps): React.JSX.Element | null {
  const t = useT();
  const group = useMindMapStore((s) => s.groups.find((g) => g.id === groupId));
  const setGroupTitle = useMindMapStore((s) => s.setGroupTitle);
  const updateGroup = useMindMapStore((s) => s.updateGroup);

  const [fonts, setFonts] = useState<string[]>([...FALLBACK_FONTS]);
  useEffect(() => {
    let alive = true;
    void listSystemFonts().then((list) => {
      if (alive) setFonts(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!group) return null;
  const ts = group.titleStyle;

  return (
    <>
      <TextField
        label={t('group.titleLabel')}
        value={group.title}
        placeholder={t('group.titlePlaceholder')}
        onChange={(value) => setGroupTitle(groupId, value)}
      />

      <ColorField
        label={t('group.fillColor')}
        value={group.color}
        fallback={COLOR_SEED.fill}
        onChange={(hex) => updateGroup(groupId, { color: hex })}
        onReset={() => updateGroup(groupId, { color: undefined })}
      />

      <FontField
        label={t('node.font')}
        value={ts?.fontFamily}
        fonts={fonts}
        onChange={(fontFamily) => updateGroup(groupId, { titleStyle: { fontFamily } })}
      />

      <NumberField
        label={t('node.fontSize')}
        value={ts?.fontSize ?? DEFAULT_TITLE_SIZE}
        min={10}
        max={40}
        suffix="px"
        onChange={(fontSize) => updateGroup(groupId, { titleStyle: { fontSize } })}
      />

      <ColorField
        label={t('node.textColor')}
        value={ts?.color}
        fallback={COLOR_SEED.text}
        onChange={(hex) => updateGroup(groupId, { titleStyle: { color: hex } })}
        onReset={() => updateGroup(groupId, { titleStyle: { color: undefined } })}
      />

      <ToggleGroupField
        label={t('node.textStyle')}
        items={[
          {
            key: 'bold',
            label: <span style={{ fontWeight: 800 }}>B</span>,
            title: t('node.bold'),
            active: Boolean(ts?.bold),
            onToggle: () => updateGroup(groupId, { titleStyle: { bold: !ts?.bold } }),
          },
          {
            key: 'italic',
            label: <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>I</span>,
            title: t('node.italic'),
            active: Boolean(ts?.italic),
            onToggle: () => updateGroup(groupId, { titleStyle: { italic: !ts?.italic } }),
          },
          {
            key: 'underline',
            label: <span style={{ textDecoration: 'underline' }}>U</span>,
            title: t('node.underline'),
            active: Boolean(ts?.underline),
            onToggle: () => updateGroup(groupId, { titleStyle: { underline: !ts?.underline } }),
          },
        ]}
      />
    </>
  );
}
