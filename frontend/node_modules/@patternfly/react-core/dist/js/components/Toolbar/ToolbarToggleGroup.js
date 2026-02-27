"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolbarToggleGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ReactDOM = tslib_1.__importStar(require("react-dom"));
const toolbar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Toolbar/toolbar"));
const react_styles_1 = require("@patternfly/react-styles");
const ToolbarUtils_1 = require("./ToolbarUtils");
const Button_1 = require("../Button");
const t_global_breakpoint_lg_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/t_global_breakpoint_lg'));
const util_1 = require("../../helpers/util");
const PageContext_1 = require("../Page/PageContext");
const ToolbarExpandableContent_1 = require("./ToolbarExpandableContent");
class ToolbarToggleGroup extends react_1.Component {
    constructor() {
        super(...arguments);
        this.toggleRef = (0, react_1.createRef)();
        this.expandableContentRef = (0, react_1.createRef)();
        this.isContentPopup = () => {
            const viewportSize = util_1.canUseDOM ? window.innerWidth : 1200;
            const lgBreakpointValue = parseInt(t_global_breakpoint_lg_1.default.value);
            return viewportSize < lgBreakpointValue;
        };
    }
    render() {
        const _a = this.props, { toggleIcon, variant, visibility, breakpoint, gap, columnGap, rowGap, className, children, isExpanded, onToggle, labelContainerRef, clearAllFilters, showClearFiltersButton, clearFiltersButtonText } = _a, props = tslib_1.__rest(_a, ["toggleIcon", "variant", "visibility", "breakpoint", "gap", "columnGap", "rowGap", "className", "children", "isExpanded", "onToggle", "labelContainerRef", "clearAllFilters", "showClearFiltersButton", "clearFiltersButtonText"]);
        if (!breakpoint && !toggleIcon) {
            // eslint-disable-next-line no-console
            console.error('ToolbarToggleGroup will not be visible without a breakpoint or toggleIcon.');
        }
        return ((0, jsx_runtime_1.jsx)(PageContext_1.PageContext.Consumer, { children: ({ width, getBreakpoint }) => ((0, jsx_runtime_1.jsx)(ToolbarUtils_1.ToolbarContext.Consumer, { children: ({ toggleIsExpanded: managedOnToggle }) => {
                    const _onToggle = onToggle !== undefined ? onToggle : managedOnToggle;
                    return ((0, jsx_runtime_1.jsx)(ToolbarUtils_1.ToolbarContentContext.Consumer, { children: ({ expandableContentRef, expandableContentId, labelContainerRef: managedLabelContainerRef, isExpanded: managedIsExpanded, clearAllFilters: clearAllFiltersContext, clearFiltersButtonText: clearFiltersButtonContext, showClearFiltersButton: showClearFiltersButtonContext }) => {
                            const _isExpanded = isExpanded !== undefined ? isExpanded : managedIsExpanded;
                            const _labelContainerRef = labelContainerRef !== undefined ? labelContainerRef : managedLabelContainerRef;
                            const breakpointMod = {};
                            breakpointMod[breakpoint] = 'show';
                            const expandableContent = ((0, jsx_runtime_1.jsx)(ToolbarExpandableContent_1.ToolbarExpandableContent, { id: expandableContentId, expandableContentRef: this.expandableContentRef, isExpanded: _isExpanded, clearAllFilters: clearAllFilters || clearAllFiltersContext, showClearFiltersButton: showClearFiltersButton || showClearFiltersButtonContext, clearFiltersButtonText: clearFiltersButtonText || clearFiltersButtonContext, labelContainerRef: _labelContainerRef, children: children }));
                            const toggleButton = ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(toolbar_1.default.toolbarToggle), children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: "plain", onClick: _onToggle, "aria-label": "Show Filters" }, (_isExpanded && { 'aria-expanded': true }), { "aria-haspopup": _isExpanded && this.isContentPopup(), "aria-controls": _isExpanded ? expandableContentId : undefined, ref: this.toggleRef, icon: toggleIcon })) }));
                            return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(toolbar_1.default.toolbarGroup, toolbar_1.default.modifiers.toggleGroup, variant &&
                                    toolbar_1.default.modifiers[(0, util_1.toCamel)(variant)], (0, util_1.formatBreakpointMods)(breakpointMod, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(visibility, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(gap, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(columnGap, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(rowGap, toolbar_1.default, '', getBreakpoint(width)), className) }, props, { children: [toggleButton, _isExpanded && ReactDOM.createPortal(expandableContent, expandableContentRef.current), !_isExpanded && children] })));
                        } }));
                } })) }));
    }
}
exports.ToolbarToggleGroup = ToolbarToggleGroup;
ToolbarToggleGroup.displayName = 'ToolbarToggleGroup';
//# sourceMappingURL=ToolbarToggleGroup.js.map