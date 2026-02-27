/// <reference types="react" />
/** Acts as the container for DualListSelectorListItem sub-components. */
export interface DualListSelectorListProps extends React.HTMLProps<HTMLUListElement> {
    /** Content rendered inside the dual list selector list. */
    children?: React.ReactNode;
    /** @hide forwarded ref */
    innerRef?: React.RefObject<HTMLUListElement | null>;
}
export declare const DualListSelectorListBase: React.FunctionComponent<DualListSelectorListProps>;
export declare const DualListSelectorList: import("react").ForwardRefExoticComponent<Omit<DualListSelectorListProps, "ref"> & import("react").RefAttributes<HTMLUListElement>>;
//# sourceMappingURL=DualListSelectorList.d.ts.map