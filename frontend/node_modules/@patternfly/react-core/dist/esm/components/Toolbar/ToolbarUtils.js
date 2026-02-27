import { createContext } from 'react';
import globalBreakpointMd from '@patternfly/react-tokens/dist/esm/t_global_breakpoint_md';
import globalBreakpointLg from '@patternfly/react-tokens/dist/esm/t_global_breakpoint_lg';
import globalBreakpointXl from '@patternfly/react-tokens/dist/esm/t_global_breakpoint_xl';
import globalBreakpoint2xl from '@patternfly/react-tokens/dist/esm/t_global_breakpoint_2xl';
export const ToolbarContext = createContext({
    isExpanded: false,
    toggleIsExpanded: () => { },
    labelGroupContentRef: null,
    updateNumberFilters: () => { },
    numberOfFilters: 0,
    clearAllFilters: () => { }
});
export const ToolbarContentContext = createContext({
    expandableContentRef: null,
    expandableContentId: '',
    labelContainerRef: null,
    clearAllFilters: () => { }
});
export const globalBreakpoints = {
    md: parseInt(globalBreakpointMd.value) * 16,
    lg: parseInt(globalBreakpointLg.value) * 16,
    xl: parseInt(globalBreakpointXl.value) * 16,
    '2xl': parseInt(globalBreakpoint2xl.value) * 16
};
//# sourceMappingURL=ToolbarUtils.js.map