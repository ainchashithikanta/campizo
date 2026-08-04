import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDebounce } from '@web/hooks/use-api';

describe('useDebounce Hook', () => {
  it('updates debounced value after delay', async () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 100), {
      initialProps: { val: 'initial' },
    });

    expect(result.current).toBe('initial');

    rerender({ val: 'updated' });
    expect(result.current).toBe('initial');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(result.current).toBe('updated');
  });
});
