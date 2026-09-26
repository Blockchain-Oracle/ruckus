import { Button } from './Button.tsx';

/** The quick stakes every VRF round offers (demo credits or the host token, same numbers). */
export const STAKE_CHIPS = ['0.5', '1', '5', '10'] as const;

type Props = {
  id: string;
  value: string;
  onChange(value: string): void;
  chips?: readonly string[];
};

/**
 * Stake input plus quick chips on one row at any width, down to a 320 px phone: the field gives
 * way (min-w-0), the chips never wrap under it. 16 px text, because iOS zooms the page into any
 * smaller field on focus and never zooms back out.
 */
export function StakeField({ id, value, onChange, chips = STAKE_CHIPS }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-sm text-cream-dim max-[380px]:sr-only">
        Stake
      </label>
      <input
        id={id}
        value={value}
        inputMode="decimal"
        placeholder="Stake"
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        className="tabular h-10 w-full min-w-12 max-w-28 flex-1 rounded-md border-2 border-line bg-ink px-2 text-base text-cream outline-none focus:border-teal"
      />
      {chips.map((v) => (
        <Button
          key={v}
          size="sm"
          aria-pressed={v === value}
          className="shrink-0 px-2.5 aria-pressed:border-teal"
          onClick={() => onChange(v)}
        >
          {v}
        </Button>
      ))}
    </div>
  );
}
