"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolbarContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const toolbar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Toolbar/toolbar"));
const react_styles_1 = require("@patternfly/react-styles");
const ToolbarUtils_1 = require("./ToolbarUtils");
const util_1 = require("../../helpers/util");
const PageContext_1 = require("../Page/PageContext");
class ToolbarContent extends react_1.Component {
    constructor() {
        super(...arguments);
        this.expandableContentRef = (0, react_1.createRef)();
        this.labelContainerRef = (0, react_1.createRef)();
    }
    render() {
        const _a = this.props, { className, children, isExpanded, toolbarId, visibility, rowWrap, alignItems, clearAllFilters, showClearFiltersButton, clearFiltersButtonText } = _a, props = tslib_1.__rest(_a, ["className", "children", "isExpanded", "toolbarId", "visibility", "rowWrap", "alignItems", "clearAllFilters", "showClearFiltersButton", "clearFiltersButtonText"]);
        return ((0, jsx_runtime_1.jsx)(PageContext_1.PageContext.Consumer, { children: ({ width, getBreakpoint }) => ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(toolbar_1.default.toolbarContent, (0, util_1.formatBreakpointMods)(visibility, toolbar_1.default, '', getBreakpoint(width)), className), ref: this.expandableContentRef }, props, { children: (0, jsx_runtime_1.jsx)(ToolbarUtils_1.ToolbarContext.Consumer, { children: ({ clearAllFilters: clearAllFiltersContext, clearFiltersButtonText: clearFiltersButtonContext, showClearFiltersButton: showClearFiltersButtonContext, isExpanded: isExpandedContext, toolbarId: toolbarIdContext }) => {
                        const expandableContentId = `${toolbarId || toolbarIdContext}-expandable-content-${ToolbarContent.currentId++}`;
                        return ((0, jsx_runtime_1.jsx)(ToolbarUtils_1.ToolbarContentContext.Provider, { value: {
                                expandableContentRef: this.expandableContentRef,
                                expandableContentId,
                                labelContainerRef: this.labelContainerRef,
                                isExpanded: isExpanded || isExpandedContext,
                                clearAllFilters: clearAllFilters || clearAllFiltersContext,
                                clearFiltersButtonText: clearFiltersButtonText || clearFiltersButtonContext,
                                showClearFiltersButton: showClearFiltersButton || showClearFiltersButtonContext
                            }, children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(toolbar_1.default.toolbarContentSection, (0, util_1.formatBreakpointMods)(rowWrap, toolbar_1.default, '', getBreakpoint(width)), alignItems === 'center' && toolbar_1.default.modifiers.alignItemsCenter, alignItems === 'start' && toolbar_1.default.modifiers.alignItemsStart, alignItems === 'baseline' && toolbar_1.default.modifiers.alignItemsBaseline), children: children }) }));
                    } }) }))) }));
    }
}
exports.ToolbarContent = ToolbarContent;
ToolbarContent.displayName = 'ToolbarContent';
ToolbarContent.currentId = 0;
ToolbarContent.defaultProps = {
    isExpanded: false,
    showClearFiltersButton: false
};
//# sourceMappingURL=ToolbarContent.js.map