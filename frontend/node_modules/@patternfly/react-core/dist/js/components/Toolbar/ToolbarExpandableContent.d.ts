import { Component, RefObject } from 'react';
import { ToolbarContext } from './ToolbarUtils';
import { PickOptional } from '../../helpers/typeUtils';
export interface ToolbarExpandableContentProps extends React.HTMLProps<HTMLDivElement> {
    /** Classes added to the root element of the data toolbar expandable content */
    className?: string;
    /** Flag indicating the expandable content is expanded */
    isExpanded?: boolean;
    /** Expandable content reference for passing to data toolbar children */
    expandableContentRef?: RefObject<HTMLDivElement | null>;
    /** Label container reference for passing to data toolbar children */
    labelContainerRef?: RefObject<any>;
    /** optional callback for clearing all filters in the toolbar */
    clearAllFilters?: () => void;
    /** Text to display in the clear all filters button */
    clearFiltersButtonText?: string;
    /** Flag indicating that the clear all filters button should be visible */
    showClearFiltersButton: boolean;
}
declare class ToolbarExpandableContent extends Component<ToolbarExpandableContentProps> {
    static displayName: string;
    static contextType: import("react").Context<import("./ToolbarUtils").ToolbarContextProps>;
    context: React.ContextType<typeof ToolbarContext>;
    static defaultProps: PickOptional<ToolbarExpandableContentProps>;
    render(): import("react/jsx-runtime").JSX.Element;
}
export { ToolbarExpandableContent };
//# sourceMappingURL=ToolbarExpandableContent.d.ts.map