/// <reference types="react" />
export declare enum DataListWrapModifier {
    nowrap = "nowrap",
    truncate = "truncate",
    breakWord = "breakWord"
}
export interface DataListProps extends React.HTMLProps<HTMLUListElement> {
    /** Content rendered inside the DataList list */
    children?: React.ReactNode;
    /** Additional classes added to the DataList list */
    className?: string;
    /** Adds accessible text to the DataList list */
    'aria-label': string;
    /** Optional callback to make DataList selectable, fired when DataListItem selected */
    onSelectDataListItem?: (event: React.MouseEvent | React.KeyboardEvent, id: string) => void;
    /** Id of DataList item currently selected */
    selectedDataListItemId?: string;
    /** Flag indicating if DataList should have compact styling */
    isCompact?: boolean;
    /** Specifies the grid breakpoints  */
    gridBreakpoint?: 'none' | 'always' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    /** Determines which wrapping modifier to apply to the DataList */
    wrapModifier?: DataListWrapModifier | 'nowrap' | 'truncate' | 'breakWord';
    /** Object that causes the data list to render hidden inputs which improve selectable item a11y */
    onSelectableRowChange?: (event: React.FormEvent<HTMLInputElement>, id: string) => void;
    /** @hide custom ref of the DataList */
    innerRef?: React.RefObject<HTMLUListElement | null>;
}
interface DataListContextProps {
    isSelectable: boolean;
    selectedDataListItemId: string;
    updateSelectedDataListItem: (event: React.MouseEvent | React.KeyboardEvent, id: string) => void;
    onSelectableRowChange?: (event: React.FormEvent<HTMLInputElement>, id: string) => void;
}
export declare const DataListContext: import("react").Context<Partial<DataListContextProps>>;
export declare const DataListBase: React.FunctionComponent<DataListProps>;
export declare const DataList: import("react").ForwardRefExoticComponent<Omit<DataListProps, "ref"> & import("react").RefAttributes<HTMLUListElement>>;
export {};
//# sourceMappingURL=DataList.d.ts.map