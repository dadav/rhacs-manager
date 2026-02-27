/// <reference types="react" />
export interface MenuContentProps extends React.HTMLProps<HTMLElement> {
    /** Items within group */
    children?: React.ReactNode;
    /** @hide Forwarded ref */
    innerRef?: React.Ref<any>;
    /** Height of the menu content */
    menuHeight?: string;
    /** Maximum height of menu content */
    maxMenuHeight?: string;
    /** Callback to return the height of the menu content */
    getHeight?: (height: string) => void;
}
export declare const MenuContent: import("react").ForwardRefExoticComponent<Omit<MenuContentProps, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=MenuContent.d.ts.map