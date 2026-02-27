"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolbarExpandableContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const toolbar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Toolbar/toolbar"));
const react_styles_1 = require("@patternfly/react-styles");
const ToolbarGroup_1 = require("./ToolbarGroup");
const ToolbarItem_1 = require("./ToolbarItem");
const Button_1 = require("../Button");
const ToolbarUtils_1 = require("./ToolbarUtils");
class ToolbarExpandableContent extends react_1.Component {
    render() {
        const _a = this.props, { children, className, expandableContentRef, labelContainerRef, isExpanded, clearAllFilters, clearFiltersButtonText, showClearFiltersButton } = _a, props = tslib_1.__rest(_a, ["children", "className", "expandableContentRef", "labelContainerRef", "isExpanded", "clearAllFilters", "clearFiltersButtonText", "showClearFiltersButton"]);
        const { numberOfFilters, customLabelGroupContent } = this.context;
        const clearLabelGroups = () => {
            clearAllFilters();
        };
        return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(toolbar_1.default.toolbarExpandableContent, isExpanded && toolbar_1.default.modifiers.expanded, className), ref: expandableContentRef }, props, { children: [(0, jsx_runtime_1.jsx)(ToolbarGroup_1.ToolbarGroup, { children: children }), numberOfFilters > 0 && ((0, jsx_runtime_1.jsxs)(ToolbarGroup_1.ToolbarGroup, { children: [(0, jsx_runtime_1.jsx)(ToolbarGroup_1.ToolbarGroup, { ref: labelContainerRef }), showClearFiltersButton && !customLabelGroupContent && ((0, jsx_runtime_1.jsx)(ToolbarItem_1.ToolbarItem, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "link", onClick: clearLabelGroups, isInline: true, children: clearFiltersButtonText }) })), customLabelGroupContent && customLabelGroupContent] }))] })));
    }
}
exports.ToolbarExpandableContent = ToolbarExpandableContent;
ToolbarExpandableContent.displayName = 'ToolbarExpandableContent';
ToolbarExpandableContent.contextType = ToolbarUtils_1.ToolbarContext;
ToolbarExpandableContent.defaultProps = {
    isExpanded: false,
    clearFiltersButtonText: 'Clear all filters'
};
//# sourceMappingURL=ToolbarExpandableContent.js.map