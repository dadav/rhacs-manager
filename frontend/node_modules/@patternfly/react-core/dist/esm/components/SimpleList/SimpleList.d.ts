import { Component } from 'react';
import { SimpleListItemProps } from './SimpleListItem';
export interface SimpleListProps extends Omit<React.HTMLProps<HTMLDivElement>, 'onSelect'> {
    /** Content rendered inside the SimpleList */
    children?: React.ReactNode;
    /** Additional classes added to the SimpleList container */
    className?: string;
    /** Callback when an item is selected */
    onSelect?: (ref: React.RefObject<HTMLButtonElement | null> | React.RefObject<HTMLAnchorElement | null>, props: SimpleListItemProps) => void;
    /** Indicates whether component is controlled by its internal state */
    isControlled?: boolean;
    /** aria-label for the <ul> element that wraps the SimpleList items. */
    'aria-label'?: string;
}
export interface SimpleListState {
    /** Ref of the current SimpleListItem */
    currentRef: React.RefObject<HTMLButtonElement | null> | React.RefObject<HTMLAnchorElement | null>;
}
interface SimpleListContextProps {
    currentRef: React.RefObject<HTMLButtonElement | null> | React.RefObject<HTMLAnchorElement | null>;
    updateCurrentRef: (id: React.RefObject<HTMLButtonElement | null> | React.RefObject<HTMLAnchorElement | null>, props: SimpleListItemProps) => void;
    isControlled: boolean;
}
export declare const SimpleListContext: import("react").Context<Partial<SimpleListContextProps>>;
declare class SimpleList extends Component<SimpleListProps, SimpleListState> {
    static displayName: string;
    state: {
        currentRef: import("react").RefObject<HTMLButtonElement> | import("react").RefObject<HTMLAnchorElement>;
    };
    static defaultProps: SimpleListProps;
    handleCurrentUpdate: (newCurrentRef: React.RefObject<HTMLButtonElement | null> | React.RefObject<HTMLAnchorElement | null>, itemProps: SimpleListItemProps) => void;
    render(): import("react/jsx-runtime").JSX.Element;
}
export { SimpleList };
//# sourceMappingURL=SimpleList.d.ts.map