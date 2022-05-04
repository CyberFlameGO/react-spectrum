/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import {
  AriaLabelingProps,
  AsyncLoadable,
  CollectionBase,
  DOMProps,
  DOMRef,
  LoadingState,
  MultipleSelection,
  SpectrumSelectionProps,
  StyleProps
} from '@react-types/shared';
import {classNames, useDOMRef, useStyleProps} from '@react-spectrum/utils';
import type {DraggableCollectionState, DroppableCollectionState} from '@react-stately/dnd';
import {DragHooks, DropHooks} from '@react-spectrum/dnd';
import {DragPreview} from './DragPreview';
import type {DroppableCollectionResult} from '@react-aria/dnd';
import {GridCollection, GridState, useGridState} from '@react-stately/grid';
import {GridKeyboardDelegate, useGrid} from '@react-aria/grid';
import InsertionIndicator from './InsertionIndicator';
// @ts-ignore
import intlMessages from '../intl/*.json';
import {ListLayout} from '@react-stately/layout';
import {ListState, useListState} from '@react-stately/list';
import listStyles from './listview.css';
import {ListViewItem} from './ListViewItem';
import {mergeProps} from '@react-aria/utils';
import {ProgressCircle} from '@react-spectrum/progress';
import React, {Key, ReactElement, useContext, useMemo, useRef} from 'react';
import {Rect} from '@react-stately/virtualizer';
import RootDropIndicator from './RootDropIndicator';
import {useCollator, useLocale, useMessageFormatter} from '@react-aria/i18n';
import {useProvider} from '@react-spectrum/provider';
import {Virtualizer} from '@react-aria/virtualizer';

interface ListViewContextValue<T> {
  state: GridState<T, GridCollection<any>>,
  keyboardDelegate: GridKeyboardDelegate<T, GridCollection<any>>,
  dragState: DraggableCollectionState,
  dropState: DroppableCollectionState,
  dragHooks: DragHooks,
  dropHooks: DropHooks,
  onAction:(key: Key) => void,
  isListDroppable: boolean,
  isListDraggable: boolean,
  layout: ListLayout<T>
}

export const ListViewContext = React.createContext<ListViewContextValue<unknown>>(null);

const ROW_HEIGHTS = {
  compact: {
    medium: 32,
    large: 40
  },
  regular: {
    medium: 40,
    large: 50
  },
  spacious: {
    medium: 48,
    large: 60
  }
};

export function useListLayout<T>(state: ListState<T>, density: ListViewProps<T>['density']) {
  let {scale} = useProvider();
  let collator = useCollator({usage: 'search', sensitivity: 'base'});
  let isEmpty = state.collection.size === 0;
  let layout = useMemo(() =>
    new ListLayout<T>({
      estimatedRowHeight: ROW_HEIGHTS[density][scale],
      padding: 0,
      collator,
      loaderHeight: isEmpty ? null : ROW_HEIGHTS[density][scale]
    })
    , [collator, scale, density, isEmpty]);

  layout.collection = state.collection;
  layout.disabledKeys = state.disabledKeys;
  return layout;
}

interface ListViewProps<T> extends CollectionBase<T>, DOMProps, AriaLabelingProps, StyleProps, MultipleSelection, SpectrumSelectionProps, Omit<AsyncLoadable, 'isLoading'> {
  /**
   * Sets the amount of vertical padding within each cell.
   * @default 'regular'
   */
  density?: 'compact' | 'regular' | 'spacious',
  /** Whether the ListView should be displayed with a quiet style. */
  isQuiet?: boolean,
  /** The current loading state of the ListView. Determines whether or not the progress circle should be shown. */
  loadingState?: LoadingState,
  /** Sets what the ListView should render when there is no content to display. */
  renderEmptyState?: () => JSX.Element,
  /**
   * The duration of animated layout changes, in milliseconds. Used by the Virtualizer.
   * @default 0
   */
  transitionDuration?: number,
  /**
   * Handler that is called when a user performs an action on an item. The exact user event depends on
   * the collection's `selectionBehavior` prop and the interaction modality.
   */
  onAction?: (key: string) => void,
  /**
   * The drag hooks returned by `useDragHooks` used to enable drag and drop behavior for the ListView. See the
   * [docs](https://react-spectrum.adobe.com/react-spectrum/useDragHooks.html) for more info.
   */
  dragHooks?: DragHooks,
  dropHooks?: DropHooks
}

function ListView<T extends object>(props: ListViewProps<T>, ref: DOMRef<HTMLDivElement>) {
  let {
    density = 'regular',
    onLoadMore,
    loadingState,
    isQuiet,
    transitionDuration = 0,
    onAction,
    dragHooks,
    dropHooks
  } = props;
  let isListDraggable = !!dragHooks;
  let isListDroppable = !!dropHooks;
  let dragHooksProvided = useRef(isListDraggable);
  let dropHooksProvided = useRef(isListDroppable);
  if (dragHooksProvided.current !== isListDraggable) {
    console.warn('Drag hooks were provided during one render, but not another. This should be avoided as it may produce unexpected behavior.');
  }
  if (dropHooksProvided.current !== isListDroppable) {
    console.warn('Drop hooks were provided during one render, but not another. This should be avoided as it may produce unexpected behavior.');
  }
  let domRef = useDOMRef(ref);
  let {collection} = useListState(props);
  let formatMessage = useMessageFormatter(intlMessages);
  let isLoading = loadingState === 'loading' || loadingState === 'loadingMore';

  let {styleProps} = useStyleProps(props);
  let {direction, locale} = useLocale();
  let collator = useCollator({usage: 'search', sensitivity: 'base'});
  let gridCollection = useMemo(() => new GridCollection({
    columnCount: 1,
    items: [...collection].map(item => ({
      ...item,
      hasChildNodes: true,
      childNodes: [{
        key: `cell-${item.key}`,
        type: 'cell',
        index: 0,
        value: null,
        level: 0,
        rendered: null,
        textValue: item.textValue,
        hasChildNodes: false,
        childNodes: []
      }]
    }))
  }), [collection]);
  let state = useGridState({
    ...props,
    collection: gridCollection,
    focusMode: 'cell',
    selectionBehavior: props.selectionStyle === 'highlight' ? 'replace' : 'toggle'
  });
  let layout = useListLayout(state, props.density || 'regular');
  let keyboardDelegate = useMemo(() => new GridKeyboardDelegate({
    collection: state.collection,
    disabledKeys: state.disabledKeys,
    ref: domRef,
    direction,
    collator,
    // Focus the ListView cell instead of the row so that focus doesn't change with left/right arrow keys when there aren't any
    // focusable children in the cell.
    focusMode: 'cell'
  }), [state, domRef, direction, collator]);

  let provider = useProvider();
  let dragState: DraggableCollectionState;
  if (isListDraggable) {
    dragState = dragHooks.useDraggableCollectionState({
      collection: state.collection,
      selectionManager: state.selectionManager,
      renderPreview(draggingKeys, draggedKey) {
        let item = state.collection.getItem(draggedKey);
        let itemCount = draggingKeys.size;
        let itemHeight = layout.getLayoutInfo(draggedKey).rect.height;
        return <DragPreview item={item} itemCount={itemCount} itemHeight={itemHeight} provider={provider} locale={locale}  />;
      }
    });
  }

  let dropState: DroppableCollectionState;
  let droppableCollection: DroppableCollectionResult;
  let isRootDropTarget: boolean;
  if (isListDroppable) {
    dropState = dropHooks.useDroppableCollectionState({
      collection: state.collection,
      selectionManager: state.selectionManager
    });
    droppableCollection = dropHooks.useDroppableCollection({
      keyboardDelegate,
      getDropTargetFromPoint(x, y) {
        let closest = null;
        let closestDistance = Infinity;
        let closestDir = null;

        x += domRef.current.scrollLeft;
        y += domRef.current.scrollTop;

        let visible = layout.getVisibleLayoutInfos(new Rect(x - 50, y - 50, x + 50, y + 50));

        for (let layoutInfo of visible) {
          let r = layoutInfo.rect;
          let points: [number, number, string][] = [
            [r.x, r.y + 4, 'before'],
            [r.maxX, r.y + 4, 'before'],
            [r.x, r.maxY - 8, 'after'],
            [r.maxX, r.maxY - 8, 'after']
          ];

          for (let [px, py, dir] of points) {
            let dx = px - x;
            let dy = py - y;
            let d = dx * dx + dy * dy;
            if (d < closestDistance) {
              closestDistance = d;
              closest = layoutInfo;
              closestDir = dir;
            }
          }

          // TODO: Best way to implement only for when closest can be dropped on
          if (y >= r.y + 10 && y <= r.maxY - 10 && state.collection.getItem(closest.key).value.type === 'folder') {
            closestDir = 'on';
          }
        }

        let key = closest?.key;
        if (key) {
          return {
            type: 'item',
            key,
            dropPosition: closestDir
          };
        }
      }
    }, dropState, domRef);

    isRootDropTarget = dropState.isDropTarget({type: 'root'});
  }

  let {gridProps} = useGrid({
    ...props,
    isVirtualized: true,
    keyboardDelegate
  }, state, domRef);

  // Sync loading state into the layout.
  layout.isLoading = isLoading;

  let focusedKey = state.selectionManager.focusedKey;
  let focusedItem = gridCollection.getItem(state.selectionManager.focusedKey);
  if (focusedItem?.parentKey != null) {
    focusedKey = focusedItem.parentKey;
  }
  if (dropState?.target?.type === 'item') {
    focusedKey = dropState.target.key;
  }
  return (
    <ListViewContext.Provider value={{state, keyboardDelegate, dragState, dropState, dragHooks, dropHooks, onAction, isListDraggable, isListDroppable, layout}}>
      <Virtualizer
        {...mergeProps(isListDroppable && droppableCollection?.collectionProps, gridProps)}
        {...styleProps}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
        ref={domRef}
        focusedKey={focusedKey}
        scrollDirection="vertical"
        className={
          classNames(
            listStyles,
            'react-spectrum-ListView',
            `react-spectrum-ListView--${density}`,
            'react-spectrum-ListView--emphasized',
            {
              'react-spectrum-ListView--quiet': isQuiet,
              'react-spectrum-ListView--loadingMore': loadingState === 'loadingMore',
              'react-spectrum-ListView--draggable': !!isListDraggable,
              'react-spectrum-ListView--dropTarget': !!isRootDropTarget
            },
            styleProps.className
          )
        }
        layout={layout}
        collection={gridCollection}
        transitionDuration={transitionDuration}>
        {(type, item) => {
          if (type === 'item') {
            return (
              <>
                {isListDroppable && state.collection.getKeyBefore(item.key) == null &&
                  <RootDropIndicator key="root" />
                }
                {isListDroppable &&
                  <InsertionIndicator
                    key={`${item.key}-before`}
                    target={{key: item.key, type: 'item', dropPosition: 'before'}} />
                }
                <ListViewItem item={item} isEmphasized />
                {isListDroppable &&
                  <InsertionIndicator
                    key={`${item.key}-after`}
                    target={{key: item.key, type: 'item', dropPosition: 'after'}} />
                }
              </>
            );
          } else if (type === 'loader') {
            return (
              <CenteredWrapper>
                <ProgressCircle
                  isIndeterminate
                  aria-label={state.collection.size > 0 ? formatMessage('loadingMore') : formatMessage('loading')} />
              </CenteredWrapper>
            );
          } else if (type === 'placeholder') {
            let emptyState = props.renderEmptyState ? props.renderEmptyState() : null;
            if (emptyState == null) {
              return null;
            }

            return (
              <CenteredWrapper>
                {emptyState}
              </CenteredWrapper>
            );
          }

        }}
      </Virtualizer>
    </ListViewContext.Provider>
  );
}

function CenteredWrapper({children}) {
  let {state} = useContext(ListViewContext);
  return (
    <div
      role="row"
      aria-rowindex={state.collection.size + 1}
      className={
        classNames(
          listStyles,
          'react-spectrum-ListView-centeredWrapper',
          {
            'react-spectrum-ListView-centeredWrapper--loadingMore': state.collection.size > 0
          }
        )}>
      <div role="gridcell">
        {children}
      </div>
    </div>
  );
}

/**
 * Lists display a linear collection of data. They allow users to quickly scan, sort, compare, and take action on large amounts of data.
 */
const _ListView = React.forwardRef(ListView) as <T>(props: ListViewProps<T> & {ref?: DOMRef<HTMLDivElement>}) => ReactElement;
export {_ListView as ListView};
