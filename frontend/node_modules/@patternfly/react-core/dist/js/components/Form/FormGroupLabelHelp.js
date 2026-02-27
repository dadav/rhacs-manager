"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormGroupLabelHelp = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Button_1 = require("../Button");
const constants_1 = require("../../helpers/constants");
const help_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/help-icon'));
const FormGroupLabelHelpBase = (_a) => {
    var { 'aria-label': ariaLabel, className, innerRef } = _a, props = tslib_1.__rest(_a, ['aria-label', "className", "innerRef"]);
    const ref = (0, react_1.useRef)(null);
    const buttonRef = innerRef || ref;
    const isMutableRef = (ref) => typeof ref === 'object' && ref !== null && 'current' in ref && ref.current !== undefined;
    const handleKeyDown = (event) => {
        if ([constants_1.KeyTypes.Space, constants_1.KeyTypes.Enter].includes(event.key) && isMutableRef(buttonRef) && buttonRef.current) {
            event.preventDefault();
            buttonRef.current.click();
        }
    };
    return ((0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ component: "span", isInline: true, ref: buttonRef, onKeyDown: handleKeyDown, "aria-label": ariaLabel, className: className, variant: "plain", hasNoPadding: true }, props, { icon: (0, jsx_runtime_1.jsx)(help_icon_1.default, {}) })));
};
exports.FormGroupLabelHelp = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(FormGroupLabelHelpBase, Object.assign({ innerRef: ref }, props))));
exports.FormGroupLabelHelp.displayName = 'FormGroupLabelHelp';
//# sourceMappingURL=FormGroupLabelHelp.js.map