import { Component } from 'react';
export interface DataListItemProps extends Omit<React.HTMLProps<HTMLLIElement>, 'children' | 'ref'> {
    /** Flag to show if the expanded content of the DataList item is visible */
    isExpanded?: boolean;
    /** Content rendered inside the DataList item */
    children: React.ReactNode;
    /** Additional classes added to the DataList item should be either <DataListItemRow> or <DataListContent> */
    className?: string;
    /** Adds an accessible name to the selectable input if one is rendered */
    'aria-labelledby': string;
    /** Unique id for the DataList item */
    id?: string;
    /** Aria label to apply to the selectable input if one is rendered */
    selectableInputAriaLabel?: string;
}
export interface DataListItemChildProps {
    /** Id for the row */
    rowid: string;
}
declare class DataListItem extends Component<DataListItemProps> {
    static displayName: string;
    static defaultProps: DataListItemProps;
    render(): import("react/jsx-runtime").JSX.Element;
}
export { DataListItem };
//# sourceMappingURL=DataListItem.d.ts.map