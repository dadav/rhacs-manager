/// <reference types="react" />
export interface MenuSearchProps extends React.HTMLProps<HTMLElement> {
    /** Items within search */
    children?: React.ReactNode;
    /** @hide Forwarded ref */
    innerRef?: React.Ref<any>;
}
export declare const MenuSearch: import("react").ForwardRefExoticComponent<Omit<MenuSearchProps, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=MenuSearch.d.ts.map