"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolbarLabelGroupContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const toolbar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Toolbar/toolbar"));
const react_styles_1 = require("@patternfly/react-styles");
const util_1 = require("../../helpers/util");
const ToolbarItem_1 = require("./ToolbarItem");
const Button_1 = require("../Button");
const ToolbarGroup_1 = require("./ToolbarGroup");
const ToolbarUtils_1 = require("./ToolbarUtils");
class ToolbarLabelGroupContent extends react_1.Component {
    render() {
        const _a = this.props, { className, isExpanded, labelGroupContentRef, clearAllFilters, showClearFiltersButton, clearFiltersButtonText, collapseListedFiltersBreakpoint, numberOfFilters, numberOfFiltersText, customLabelGroupContent } = _a, props = tslib_1.__rest(_a, ["className", "isExpanded", "labelGroupContentRef", "clearAllFilters", "showClearFiltersButton", "clearFiltersButtonText", "collapseListedFiltersBreakpoint", "numberOfFilters", "numberOfFiltersText", "customLabelGroupContent"]);
        const clearLabelGroups = () => {
            clearAllFilters();
        };
        let collapseListedFilters = false;
        if (collapseListedFiltersBreakpoint === 'all') {
            collapseListedFilters = true;
        }
        else if (util_1.canUseDOM) {
            collapseListedFilters =
                (util_1.canUseDOM ? window.innerWidth : 1200) < ToolbarUtils_1.globalBreakpoints[collapseListedFiltersBreakpoint];
        }
        const isHidden = numberOfFilters === 0 || isExpanded;
        const showNumberOfFilters = collapseListedFilters && numberOfFilters > 0 && !isExpanded;
        const showDefaultClearFilter = showClearFiltersButton && !isExpanded && !customLabelGroupContent;
        return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(toolbar_1.default.toolbarContent, isHidden && toolbar_1.default.modifiers.hidden, className) }, ((numberOfFilters === 0 || isExpanded) && { hidden: true }), { ref: labelGroupContentRef }, props, { children: [(0, jsx_runtime_1.jsx)(ToolbarGroup_1.ToolbarGroup, Object.assign({ className: (0, react_styles_1.css)(collapseListedFilters && toolbar_1.default.modifiers.hidden) }, (collapseListedFilters && { hidden: true }), (collapseListedFilters && { 'aria-hidden': true }))), (showNumberOfFilters || showDefaultClearFilter || customLabelGroupContent) && ((0, jsx_runtime_1.jsxs)(ToolbarGroup_1.ToolbarGroup, { variant: "action-group-inline", children: [showNumberOfFilters && (0, jsx_runtime_1.jsx)(ToolbarItem_1.ToolbarItem, { children: numberOfFiltersText(numberOfFilters) }), showDefaultClearFilter && ((0, jsx_runtime_1.jsx)(ToolbarItem_1.ToolbarItem, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "link", onClick: clearLabelGroups, isInline: true, children: clearFiltersButtonText }) })), customLabelGroupContent && customLabelGroupContent] }))] })));
    }
}
exports.ToolbarLabelGroupContent = ToolbarLabelGroupContent;
ToolbarLabelGroupContent.displayName = 'ToolbarLabelGroupContent';
ToolbarLabelGroupContent.defaultProps = {
    clearFiltersButtonText: 'Clear all filters',
    collapseListedFiltersBreakpoint: 'lg',
    numberOfFiltersText: (numberOfFilters) => `${numberOfFilters} filters applied`
};
//# sourceMappingURL=ToolbarLabelGroupContent.js.map