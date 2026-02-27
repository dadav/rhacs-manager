import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Component, createRef } from 'react';
import styles from '@patternfly/react-styles/css/components/Toolbar/toolbar.mjs';
import { css } from '@patternfly/react-styles';
import { ToolbarContentContext, ToolbarContext } from './ToolbarUtils';
import { formatBreakpointMods } from '../../helpers/util';
import { PageContext } from '../Page/PageContext';
class ToolbarContent extends Component {
    constructor() {
        super(...arguments);
        this.expandableContentRef = createRef();
        this.labelContainerRef = createRef();
    }
    render() {
        const _a = this.props, { className, children, isExpanded, toolbarId, visibility, rowWrap, alignItems, clearAllFilters, showClearFiltersButton, clearFiltersButtonText } = _a, props = __rest(_a, ["className", "children", "isExpanded", "toolbarId", "visibility", "rowWrap", "alignItems", "clearAllFilters", "showClearFiltersButton", "clearFiltersButtonText"]);
        return (_jsx(PageContext.Consumer, { children: ({ width, getBreakpoint }) => (_jsx("div", Object.assign({ className: css(styles.toolbarContent, formatBreakpointMods(visibility, styles, '', getBreakpoint(width)), className), ref: this.expandableContentRef }, props, { children: _jsx(ToolbarContext.Consumer, { children: ({ clearAllFilters: clearAllFiltersContext, clearFiltersButtonText: clearFiltersButtonContext, showClearFiltersButton: showClearFiltersButtonContext, isExpanded: isExpandedContext, toolbarId: toolbarIdContext }) => {
                        const expandableContentId = `${toolbarId || toolbarIdContext}-expandable-content-${ToolbarContent.currentId++}`;
                        return (_jsx(ToolbarContentContext.Provider, { value: {
                                expandableContentRef: this.expandableContentRef,
                                expandableContentId,
                                labelContainerRef: this.labelContainerRef,
                                isExpanded: isExpanded || isExpandedContext,
                                clearAllFilters: clearAllFilters || clearAllFiltersContext,
                                clearFiltersButtonText: clearFiltersButtonText || clearFiltersButtonContext,
                                showClearFiltersButton: showClearFiltersButton || showClearFiltersButtonContext
                            }, children: _jsx("div", { className: css(styles.toolbarContentSection, formatBreakpointMods(rowWrap, styles, '', getBreakpoint(width)), alignItems === 'center' && styles.modifiers.alignItemsCenter, alignItems === 'start' && styles.modifiers.alignItemsStart, alignItems === 'baseline' && styles.modifiers.alignItemsBaseline), children: children }) }));
                    } }) }))) }));
    }
}
ToolbarContent.displayName = 'ToolbarContent';
ToolbarContent.currentId = 0;
ToolbarContent.defaultProps = {
    isExpanded: false,
    showClearFiltersButton: false
};
export { ToolbarContent };
//# sourceMappingURL=ToolbarContent.js.map