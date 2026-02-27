import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
export const FormSelectOptionGroup = (_a) => {
    var { children = null, className = '', isDisabled = false, label } = _a, props = __rest(_a, ["children", "className", "isDisabled", "label"]);
    return (_jsx("optgroup", Object.assign({}, props, { disabled: !!isDisabled, className: className, label: label, children: children })));
};
FormSelectOptionGroup.displayName = 'FormSelectOptionGroup';
//# sourceMappingURL=FormSelectOptionGroup.js.map