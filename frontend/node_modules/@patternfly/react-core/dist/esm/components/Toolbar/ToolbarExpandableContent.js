import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import styles from '@patternfly/react-styles/css/components/Toolbar/toolbar.mjs';
import { css } from '@patternfly/react-styles';
import { ToolbarGroup } from './ToolbarGroup';
import { ToolbarItem } from './ToolbarItem';
import { Button } from '../Button';
import { ToolbarContext } from './ToolbarUtils';
class ToolbarExpandableContent extends Component {
    render() {
        const _a = this.props, { children, className, expandableContentRef, labelContainerRef, isExpanded, clearAllFilters, clearFiltersButtonText, showClearFiltersButton } = _a, props = __rest(_a, ["children", "className", "expandableContentRef", "labelContainerRef", "isExpanded", "clearAllFilters", "clearFiltersButtonText", "showClearFiltersButton"]);
        const { numberOfFilters, customLabelGroupContent } = this.context;
        const clearLabelGroups = () => {
            clearAllFilters();
        };
        return (_jsxs("div", Object.assign({ className: css(styles.toolbarExpandableContent, isExpanded && styles.modifiers.expanded, className), ref: expandableContentRef }, props, { children: [_jsx(ToolbarGroup, { children: children }), numberOfFilters > 0 && (_jsxs(ToolbarGroup, { children: [_jsx(ToolbarGroup, { ref: labelContainerRef }), showClearFiltersButton && !customLabelGroupContent && (_jsx(ToolbarItem, { children: _jsx(Button, { variant: "link", onClick: clearLabelGroups, isInline: true, children: clearFiltersButtonText }) })), customLabelGroupContent && customLabelGroupContent] }))] })));
    }
}
ToolbarExpandableContent.displayName = 'ToolbarExpandableContent';
ToolbarExpandableContent.contextType = ToolbarContext;
ToolbarExpandableContent.defaultProps = {
    isExpanded: false,
    clearFiltersButtonText: 'Clear all filters'
};
export { ToolbarExpandableContent };
//# sourceMappingURL=ToolbarExpandableContent.js.map