import { RefObject } from 'react';
export interface ToolbarContextProps {
    isExpanded: boolean;
    toggleIsExpanded: () => void;
    labelGroupContentRef: RefObject<HTMLDivElement | null>;
    updateNumberFilters: (categoryName: string, numberOfFilters: number) => void;
    numberOfFilters: number;
    clearAllFilters?: () => void;
    clearFiltersButtonText?: string;
    showClearFiltersButton?: boolean;
    toolbarId?: string;
    customLabelGroupContent?: React.ReactNode;
}
export declare const ToolbarContext: import("react").Context<ToolbarContextProps>;
interface ToolbarContentContextProps {
    expandableContentRef: RefObject<HTMLDivElement | null>;
    expandableContentId: string;
    labelContainerRef: RefObject<any>;
    isExpanded?: boolean;
    clearAllFilters?: () => void;
    clearFiltersButtonText?: string;
    showClearFiltersButton?: boolean;
}
export declare const ToolbarContentContext: import("react").Context<ToolbarContentContextProps>;
export declare const globalBreakpoints: {
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
};
export {};
//# sourceMappingURL=ToolbarUtils.d.ts.map