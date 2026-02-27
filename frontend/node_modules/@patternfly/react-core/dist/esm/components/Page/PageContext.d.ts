/// <reference types="react" />
export interface PageContextProps {
    isManagedSidebar: boolean;
    onSidebarToggle: () => void;
    isSidebarOpen: boolean;
    width: number;
    height: number;
    getBreakpoint: (width: number | null) => 'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    getVerticalBreakpoint: (height: number | null) => 'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}
export declare const pageContextDefaults: PageContextProps;
export declare const PageContext: import("react").Context<PageContextProps>;
export declare const PageContextProvider: import("react").Provider<PageContextProps>;
export declare const PageContextConsumer: import("react").Consumer<PageContextProps>;
//# sourceMappingURL=PageContext.d.ts.map