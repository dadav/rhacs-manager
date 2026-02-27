"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualListSelectorControl = exports.DualListSelectorControlBase = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const Button_1 = require("../Button");
const Tooltip_1 = require("../Tooltip");
const dual_list_selector_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DualListSelector/dual-list-selector"));
const DualListSelectorControlBase = (_a) => {
    var { innerRef, children, icon, className, 'aria-label': ariaLabel, isDisabled = true, onClick = () => { }, tooltipContent, tooltipProps = {} } = _a, props = tslib_1.__rest(_a, ["innerRef", "children", "icon", "className", 'aria-label', "isDisabled", "onClick", "tooltipContent", "tooltipProps"]);
    const privateRef = (0, react_1.useRef)(null);
    const ref = innerRef || privateRef;
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorControlsItem, className) }, props, { children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { isDisabled: isDisabled, "aria-disabled": isDisabled, variant: Button_1.ButtonVariant.plain, onClick: onClick, "aria-label": ariaLabel, tabIndex: -1, ref: ref, icon: icon, children: children }), tooltipContent && (0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, Object.assign({ content: tooltipContent, position: "left", triggerRef: ref }, tooltipProps))] })));
};
exports.DualListSelectorControlBase = DualListSelectorControlBase;
exports.DualListSelectorControlBase.displayName = 'DualListSelectorControlBase';
exports.DualListSelectorControl = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(exports.DualListSelectorControlBase, Object.assign({ innerRef: ref }, props))));
exports.DualListSelectorControl.displayName = 'DualListSelectorControl';
//# sourceMappingURL=DualListSelectorControl.js.map