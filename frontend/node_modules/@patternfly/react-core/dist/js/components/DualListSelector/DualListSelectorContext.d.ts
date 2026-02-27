/// <reference types="react" />
export declare const DualListSelectorContext: import("react").Context<{
    isTree?: boolean;
    hasAnimations?: boolean;
}>;
export declare const DualListSelectorListContext: import("react").Context<{
    setFocusedOption?: (id: string) => void;
    isTree?: boolean;
    ariaLabelledBy?: string;
    focusedOption?: string;
    displayOption?: (option: React.ReactNode) => boolean;
    selectedOptions?: string[] | number[];
    id?: string;
    options?: React.ReactNode[];
    isDisabled?: boolean;
}>;
export declare const DualListSelectorPaneContext: import("react").Context<{
    isChosen: boolean;
}>;
//# sourceMappingURL=DualListSelectorContext.d.ts.map