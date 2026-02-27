import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import styles from '@patternfly/react-styles/css/components/Toolbar/toolbar.mjs';
import { css } from '@patternfly/react-styles';
import { canUseDOM } from '../../helpers/util';
import { ToolbarItem } from './ToolbarItem';
import { Button } from '../Button';
import { ToolbarGroup } from './ToolbarGroup';
import { globalBreakpoints } from './ToolbarUtils';
class ToolbarLabelGroupContent extends Component {
    render() {
        const _a = this.props, { className, isExpanded, labelGroupContentRef, clearAllFilters, showClearFiltersButton, clearFiltersButtonText, collapseListedFiltersBreakpoint, numberOfFilters, numberOfFiltersText, customLabelGroupContent } = _a, props = __rest(_a, ["className", "isExpanded", "labelGroupContentRef", "clearAllFilters", "showClearFiltersButton", "clearFiltersButtonText", "collapseListedFiltersBreakpoint", "numberOfFilters", "numberOfFiltersText", "customLabelGroupContent"]);
        const clearLabelGroups = () => {
            clearAllFilters();
        };
        let collapseListedFilters = false;
        if (collapseListedFiltersBreakpoint === 'all') {
            collapseListedFilters = true;
        }
        else if (canUseDOM) {
            collapseListedFilters =
                (canUseDOM ? window.innerWidth : 1200) < globalBreakpoints[collapseListedFiltersBreakpoint];
        }
        const isHidden = numberOfFilters === 0 || isExpanded;
        const showNumberOfFilters = collapseListedFilters && numberOfFilters > 0 && !isExpanded;
        const showDefaultClearFilter = showClearFiltersButton && !isExpanded && !customLabelGroupContent;
        return (_jsxs("div", Object.assign({ className: css(styles.toolbarContent, isHidden && styles.modifiers.hidden, className) }, ((numberOfFilters === 0 || isExpanded) && { hidden: true }), { ref: labelGroupContentRef }, props, { children: [_jsx(ToolbarGroup, Object.assign({ className: css(collapseListedFilters && styles.modifiers.hidden) }, (collapseListedFilters && { hidden: true }), (collapseListedFilters && { 'aria-hidden': true }))), (showNumberOfFilters || showDefaultClearFilter || customLabelGroupContent) && (_jsxs(ToolbarGroup, { variant: "action-group-inline", children: [showNumberOfFilters && _jsx(ToolbarItem, { children: numberOfFiltersText(numberOfFilters) }), showDefaultClearFilter && (_jsx(ToolbarItem, { children: _jsx(Button, { variant: "link", onClick: clearLabelGroups, isInline: true, children: clearFiltersButtonText }) })), customLabelGroupContent && customLabelGroupContent] }))] })));
    }
}
ToolbarLabelGroupContent.displayName = 'ToolbarLabelGroupContent';
ToolbarLabelGroupContent.defaultProps = {
    clearFiltersButtonText: 'Clear all filters',
    collapseListedFiltersBreakpoint: 'lg',
    numberOfFiltersText: (numberOfFilters) => `${numberOfFilters} filters applied`
};
export { ToolbarLabelGroupContent };
//# sourceMappingURL=ToolbarLabelGroupContent.js.map