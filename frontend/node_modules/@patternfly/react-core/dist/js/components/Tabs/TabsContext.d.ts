/// <reference types="react" />
export interface TabsContextProps {
    variant: 'default' | 'secondary';
    mountOnEnter: boolean;
    unmountOnExit: boolean;
    localActiveKey: string | number;
    uniqueId: string;
    setAccentStyles?: (shouldInitializeStyles?: boolean) => void;
    handleTabClick: (event: React.MouseEvent<HTMLElement, MouseEvent>, eventKey: number | string, tabContentRef: React.RefObject<any>) => void;
    handleTabClose?: (event: React.MouseEvent<HTMLElement, MouseEvent>, eventKey: number | string, tabContentRef?: React.RefObject<any>) => void;
}
export declare const TabsContext: import("react").Context<TabsContextProps>;
export declare const TabsContextProvider: import("react").Provider<TabsContextProps>;
export declare const TabsContextConsumer: import("react").Consumer<TabsContextProps>;
//# sourceMappingURL=TabsContext.d.ts.map