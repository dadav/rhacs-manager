"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolbarGroup = exports.ToolbarGroupVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const toolbar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Toolbar/toolbar"));
const react_styles_1 = require("@patternfly/react-styles");
const util_1 = require("../../helpers/util");
const PageContext_1 = require("../Page/PageContext");
var ToolbarGroupVariant;
(function (ToolbarGroupVariant) {
    ToolbarGroupVariant["filter-group"] = "filter-group";
    ToolbarGroupVariant["action-group"] = "action-group";
    ToolbarGroupVariant["action-group-inline"] = "action-group-inline";
    ToolbarGroupVariant["action-group-plain"] = "action-group-plain";
    ToolbarGroupVariant["label-group"] = "label-group";
})(ToolbarGroupVariant || (exports.ToolbarGroupVariant = ToolbarGroupVariant = {}));
class ToolbarGroupWithRef extends react_1.Component {
    render() {
        const _a = this.props, { visibility, align, alignItems, alignSelf, gap, columnGap, rowGap, rowWrap, className, variant, children, isOverflowContainer, innerRef } = _a, props = tslib_1.__rest(_a, ["visibility", "align", "alignItems", "alignSelf", "gap", "columnGap", "rowGap", "rowWrap", "className", "variant", "children", "isOverflowContainer", "innerRef"]);
        return ((0, jsx_runtime_1.jsx)(PageContext_1.PageContext.Consumer, { children: ({ width, getBreakpoint }) => ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(toolbar_1.default.toolbarGroup, variant &&
                    toolbar_1.default.modifiers[(0, util_1.toCamel)(variant)], (0, util_1.formatBreakpointMods)(visibility, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(align, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(gap, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(columnGap, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(rowGap, toolbar_1.default, '', getBreakpoint(width)), (0, util_1.formatBreakpointMods)(rowWrap, toolbar_1.default, '', getBreakpoint(width)), alignItems === 'start' && toolbar_1.default.modifiers.alignItemsStart, alignItems === 'center' && toolbar_1.default.modifiers.alignItemsCenter, alignItems === 'baseline' && toolbar_1.default.modifiers.alignItemsBaseline, alignSelf === 'start' && toolbar_1.default.modifiers.alignSelfStart, alignSelf === 'center' && toolbar_1.default.modifiers.alignSelfCenter, alignSelf === 'baseline' && toolbar_1.default.modifiers.alignSelfBaseline, isOverflowContainer && toolbar_1.default.modifiers.overflowContainer, className) }, props, { ref: innerRef, children: children }))) }));
    }
}
exports.ToolbarGroup = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(ToolbarGroupWithRef, Object.assign({}, props, { innerRef: ref }))));
//# sourceMappingURL=ToolbarGroup.js.map