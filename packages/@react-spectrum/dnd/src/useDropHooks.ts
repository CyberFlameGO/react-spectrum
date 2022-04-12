import {DropIndicatorAria, DropIndicatorProps, DroppableCollectionOptions, DroppableCollectionResult, DroppableItemOptions, DroppableItemResult, useDropIndicator, useDroppableCollection, useDroppableItem} from '@react-aria/dnd';
import {DroppableCollectionState, DroppableCollectionStateOptions, useDroppableCollectionState} from '@react-stately/dnd';
import {RefObject, useMemo} from 'react';

export interface DropHooks {
    useDroppableCollectionState(props: DroppableCollectionStateOptions): DroppableCollectionState,
    useDroppableCollection(props: DroppableCollectionOptions, state: DroppableCollectionState, ref: RefObject<HTMLElement>): DroppableCollectionResult,
    useDroppableItem(options: DroppableItemOptions, state: DroppableCollectionState, ref: RefObject<HTMLElement>): DroppableItemResult,
    useDropIndicator(props: DropIndicatorProps, state: DroppableCollectionState, ref: RefObject<HTMLElement>): DropIndicatorAria
}

export type DropHookOptions = Omit<DroppableCollectionOptions, 'collection' | 'selectionManager'>

export function useDropHooks(options: DropHookOptions): DropHooks {
  return useMemo(() => ({
    useDroppableCollectionState(props: DroppableCollectionStateOptions) {
      let {
        collection,
        selectionManager,
        getDropOperation,
        onDropEnter,
        onDropMove,
        onDropActivate,
        onDropExit,
        onDrop
      } = props;
      
      return useDroppableCollectionState({
        collection,
        selectionManager,
        getDropOperation,
        onDropEnter,
        onDropMove,
        onDropActivate,
        onDropExit,
        onDrop,
        ...options
      });
    },
    useDroppableItem,
    useDroppableCollection,
    useDropIndicator
  }), [options]);
}
