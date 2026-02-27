"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropdownItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const Menu_1 = require("../Menu");
const helpers_1 = require("../../helpers");
const DropdownItemBase = (_a) => {
    var { children, className, description, isDisabled, isAriaDisabled, value, onClick, ouiaId, ouiaSafe, innerRef, tooltipProps } = _a, props = tslib_1.__rest(_a, ["children", "className", "description", "isDisabled", "isAriaDisabled", "value", "onClick", "ouiaId", "ouiaSafe", "innerRef", "tooltipProps"]);
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.DropdownItem.displayName, ouiaId, ouiaSafe);
    return ((0, jsx_runtime_1.jsx)(Menu_1.MenuItem, Object.assign({ className: (0, react_styles_1.css)(className), description: description, isDisabled: isDisabled, isAriaDisabled: isAriaDisabled, itemId: value, onClick: onClick, tooltipProps: tooltipProps, ref: innerRef }, ouiaProps, props, { children: children })));
};
exports.DropdownItem = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(DropdownItemBase, Object.assign({}, props, { innerRef: ref }))));
exports.DropdownItem.displayName = 'DropdownItem';
//# sourceMappingURL=DropdownItem.js.map