/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {ChangeEvent, RefObject, useCallback, useRef} from 'react';
import {DOMAttributes} from '@react-types/shared';
import {focusSafely} from '@react-aria/focus';
import {focusWithoutScrolling, mergeProps, useId} from '@react-aria/utils';
import {getColumnHeaderId} from './utils';
import {GridNode} from '@react-types/grid';
// @ts-ignore
import intlMessages from '../intl/*.json';
import {TableColumnResizeState, TableState} from '@react-stately/table';
import {useKeyboard, useMove, usePress} from '@react-aria/interactions';
import {useLocale, useLocalizedStringFormatter} from '@react-aria/i18n';

export interface TableColumnResizeAria {
  inputProps: DOMAttributes,
  resizerProps: DOMAttributes
}

export interface AriaTableColumnResizeProps<T> {
  column: GridNode<T>,
  label: string,
  triggerRef: RefObject<HTMLDivElement>
}

export function useTableColumnResize<T>(props: AriaTableColumnResizeProps<T>, state: TableState<T>, columnState: TableColumnResizeState<T>, ref: RefObject<HTMLInputElement>): TableColumnResizeAria {
  let {column: item, triggerRef} = props;
  const stateRef = useRef<TableColumnResizeState<T>>(null);
  // keep track of what the cursor on the body is so it can be restored back to that when done resizing
  const cursor = useRef<string | null>(null);
  stateRef.current = columnState;
  const stringFormatter = useLocalizedStringFormatter(intlMessages);
  let id = useId();

  let {direction} = useLocale();
  let {keyboardProps} = useKeyboard({
    onKeyDown: (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') {
        e.preventDefault();
        // switch focus back to the column header on anything that ends edit mode
        focusSafely(triggerRef.current);
      }
    }
  });

  const columnResizeWidthRef = useRef<number>(0);
  const {moveProps} = useMove({
    onMoveStart() {
      columnResizeWidthRef.current = stateRef.current.getColumnWidth(item.key);
      cursor.current = document.body.style.cursor;
    },
    onMove({deltaX, pointerType}) {
      if (direction === 'rtl') {
        deltaX *= -1;
      }
      // if moving up/down only, no need to resize
      if (deltaX !== 0) {
        if (pointerType === 'keyboard') {
          deltaX *= 10;
        }
        columnResizeWidthRef.current += deltaX;
        stateRef.current.onColumnResize(item, columnResizeWidthRef.current);
        if (stateRef.current.getColumnMinWidth(item.key) >= stateRef.current.getColumnWidth(item.key)) {
          document.body.style.setProperty('cursor', direction === 'rtl' ? 'w-resize' : 'e-resize');
        } else if (stateRef.current.getColumnMaxWidth(item.key) <= stateRef.current.getColumnWidth(item.key)) {
          document.body.style.setProperty('cursor', direction === 'rtl' ? 'e-resize' : 'w-resize');
        } else {
          document.body.style.setProperty('cursor', 'col-resize');
        }
      }
    },
    onMoveEnd() {
      columnResizeWidthRef.current = 0;
      document.body.style.cursor = cursor.current;
    }
  });
  let min = Math.floor(stateRef.current.getColumnMinWidth(item.key));
  let max = Math.floor(stateRef.current.getColumnMaxWidth(item.key));
  if (max === Infinity) {
    max = Number.MAX_SAFE_INTEGER;
  }
  let value = Math.floor(stateRef.current.getColumnWidth(item.key));

  let ariaProps = {
    'aria-label': props.label,
    'aria-orientation': 'horizontal' as 'horizontal',
    'aria-labelledby': `${id} ${getColumnHeaderId(state, item.key)}`,
    'aria-valuetext': stringFormatter.format('columnSize', {value}),
    min,
    max,
    value
  };

  const focusInput = useCallback(() => {
    if (ref.current) {
      focusWithoutScrolling(ref.current);
    }
  }, [ref]);

  let onChange = (e: ChangeEvent<HTMLInputElement>) => {
    let currentWidth = stateRef.current.getColumnWidth(item.key);
    let nextValue = parseFloat(e.target.value);

    if (nextValue > currentWidth) {
      nextValue = currentWidth + 10;
    } else {
      nextValue = currentWidth - 10;
    }
    stateRef.current.onColumnResize(item, nextValue);
  };

  let {pressProps} = usePress({
    onPressStart: (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || e.pointerType === 'keyboard') {
        return;
      }
      if (e.pointerType === 'virtual' && columnState.currentlyResizingColumn != null) {
        stateRef.current.onColumnResizeEnd(item);
        focusSafely(triggerRef.current);
        return;
      }
      focusInput();
    },
    onPress: (e) => {
      if (e.pointerType === 'touch') {
        focusInput();
      } else if (e.pointerType !== 'virtual') {
        focusSafely(triggerRef.current);
      }
    }
  });

  return {
    resizerProps: mergeProps(
      keyboardProps,
      moveProps,
      pressProps
    ),
    inputProps: mergeProps(
      {
        id,
        onFocus: () => {
          // useMove calls onMoveStart for every keypress, but we want resize start to only be called when we start resize mode
          // call instead during focus and blur
          stateRef.current.onColumnResizeStart(item);
          state.setKeyboardNavigationDisabled(true);
        },
        onBlur: () => {
          stateRef.current.onColumnResizeEnd(item);
          state.setKeyboardNavigationDisabled(false);
        },
        onChange
      },
      ariaProps
    )
  };
}
